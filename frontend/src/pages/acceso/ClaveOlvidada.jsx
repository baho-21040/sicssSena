import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/login.css'; // Reutilizamos estilos del login
import { API_BASE_URL } from '../../config/api.js';

export default function ClaveOlvidada() {
    const navigate = useNavigate();

    // Pasos: 1=Documento, 2=Código, 3=Nueva Contraseña, 4=Éxito
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Datos del formulario
    const [documento, setDocumento] = useState('');
    const [emailMasked, setEmailMasked] = useState('');
    const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
    const [tempToken, setTempToken] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Timer
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutos
    const timerRef = useRef(null);

    // Referencias para inputs de código
    const codeRefs = useRef([]);

    useEffect(() => {
        if (step === 2 && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [step, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Paso 1: Solicitar código
    const handleRequestCode = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/password/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documento })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                setEmailMasked(data.email_masked);
                setStep(2);
                setTimeLeft(300); // Reiniciar timer
            } else {
                setError(data.message || 'Error al solicitar código');
            }
        } catch (err) {
            setError('Error de conexión. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Paso 2: Manejo de inputs de código
    const handleCodeChange = (index, value) => {
        if (isNaN(value)) return;

        const newCodigo = [...codigo];
        newCodigo[index] = value;
        setCodigo(newCodigo);

        // Auto-focus siguiente input
        if (value !== '' && index < 5) {
            codeRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !codigo[index] && index > 0) {
            codeRefs.current[index - 1].focus();
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const codeString = codigo.join('');
        if (codeString.length !== 6) {
            setError('Por favor ingrese el código completo de 6 dígitos');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/password/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documento, token: codeString })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                setTempToken(data.temp_token);
                setStep(3);
            } else {
                setError(data.message || 'Código inválido o expirado');
            }
        } catch (err) {
            setError('Error de conexión. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (isLoading) return;
        setCodigo(['', '', '', '', '', '']);
        await handleRequestCode({ preventDefault: () => { } });
    };

    // Paso 3: Cambiar contraseña
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/password/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    temp_token: tempToken,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                setStep(4);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(data.message || 'Error al cambiar contraseña');
            }
        } catch (err) {
            setError('Error de conexión. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="background-container">
            <div className="login-container">
                <div className="login-card" style={{ maxWidth: '500px' }}>
                    <div className="login-header">
                        <img className="logosena" src="https://ape.sena.edu.co/imgLayout/logos/Logosimbolo-SENA-PRINCIPAL.png" alt="logo del SENA" />
                        <h1 className="titulo-bienvenida">Recuperar Contraseña</h1>
                        <p className="subtitulo">Sistema de Control de Salidas</p>
                    </div>

                    {error && (
                        <div className="error-message" style={{ marginBottom: '20px' }}>
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}

                    {/* PASO 1: SOLICITAR CÓDIGO */}
                    {step === 1 && (
                        <form onSubmit={handleRequestCode}>
                            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                                Ingresa tu número de documento para recibir un código de recuperación.
                            </p>

                            <div className="input-group-v2">
                                <i className="fas fa-id-card input-icon"></i>
                                <input
                                    type="text"
                                    placeholder="Documento de Identidad"
                                    value={documento}
                                    onChange={(e) => setDocumento(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <button type="submit" className="btn-login-v2" disabled={isLoading}>
                                {isLoading ? 'Enviando...' : 'Continuar'} <i className="fas fa-arrow-right"></i>
                            </button>

                            <div className="separator"></div>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <p style={{ fontSize: '14px', color: '#666' }}>¿Ya recordaste tu contraseña?</p>
                                <Link to="/login" className="btn-secondary-link">
                                    <i className="fas fa-arrow-left"></i> Volver al inicio de sesión
                                </Link>
                            </div>
                        </form>
                    )}

                    {/* PASO 2: INGRESAR CÓDIGO */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyCode}>
                            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                                <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                    <i className="fas fa-envelope-open-text" style={{ fontSize: '24px', color: '#39A900', marginBottom: '10px' }}></i>
                                    <p style={{ margin: 0, color: '#333' }}>Hemos enviado un código a:</p>
                                    <strong style={{ color: '#39A900', fontSize: '18px' }}>{emailMasked}</strong>
                                </div>
                                <p style={{ fontSize: '14px', color: '#666' }}>Ingresa el código de 6 dígitos:</p>
                            </div>

                            <div className="code-inputs-container" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
                                {codigo.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={el => codeRefs.current[index] = el}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        style={{
                                            width: '45px',
                                            height: '55px',
                                            fontSize: '24px',
                                            textAlign: 'center',
                                            border: '2px solid #ddd',
                                            borderRadius: '8px',
                                            outline: 'none',
                                            fontWeight: 'bold',
                                            color: '#333'
                                        }}
                                    />
                                ))}
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '25px', color: timeLeft < 60 ? '#dc3545' : '#666' }}>
                                <i className="fas fa-clock"></i> El código expira en: <strong>{formatTime(timeLeft)}</strong>
                            </div>

                            <button type="submit" className="btn-login-v2" disabled={isLoading}>
                                {isLoading ? 'Verificando...' : 'Verificar Código'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    className="btn-text"
                                    style={{ background: 'none', border: 'none', color: '#39A900', cursor: 'pointer', textDecoration: 'underline' }}
                                    disabled={isLoading || timeLeft > 280}
                                >
                                    ¿No recibiste el código? Reenviar
                                </button>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="btn-text"
                                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                                >
                                    <i className="fas fa-arrow-left"></i> Cambiar documento
                                </button>
                            </div>
                        </form>
                    )}

                    {/* PASO 3: NUEVA CONTRASEÑA */}
                    {step === 3 && (
                        <form onSubmit={handleResetPassword}>
                            <h3 style={{ textAlign: 'center', color: '#39A900', marginBottom: '20px' }}>Crear Nueva Contraseña</h3>

                            <div className="input-group-v2">
                                <i className="fas fa-lock input-icon"></i>
                                <input
                                    type="password"
                                    placeholder="Nueva Contraseña"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength="8"
                                />
                            </div>

                            <div className="input-group-v2">
                                <i className="fas fa-lock input-icon"></i>
                                <input
                                    type="password"
                                    placeholder="Confirmar Contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength="8"
                                />
                            </div>

                            <ul style={{ fontSize: '13px', color: '#666', paddingLeft: '20px', marginBottom: '20px' }}>
                                <li>Mínimo 8 caracteres</li>
                                <li>Se recomienda usar mayúsculas y números</li>
                            </ul>

                            <button type="submit" className="btn-login-v2" disabled={isLoading}>
                                {isLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
                            </button>
                        </form>
                    )}

                    {/* PASO 4: ÉXITO */}
                    {step === 4 && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{
                                width: '80px', height: '80px', background: '#39A900', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                            }}>
                                <i className="fas fa-check" style={{ fontSize: '40px', color: 'white' }}></i>
                            </div>
                            <h2 style={{ color: '#39A900', marginBottom: '10px' }}>¡Contraseña Actualizada!</h2>
                            <p style={{ color: '#666' }}>Tu contraseña ha sido cambiada exitosamente.</p>
                            <p style={{ color: '#666', fontSize: '14px' }}>Redirigiendo al login...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}