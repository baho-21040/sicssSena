import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import '../../styles/login.css';
import { login as loginApi, selectAccount as selectAccountApi } from '../../services/auth.js';
import { useUser } from '../../contexts/UserContext.jsx';
import siccsLogo from '../../assets/siccslogo.png';


export default function Login() {
    const [documento, setDocumento] = useState('');
    const [password, setPassword] = useState('');
    const [showInactiveModal, setShowInactiveModal] = useState(false);
    const [showMultiAccountModal, setShowMultiAccountModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [multiAccounts, setMultiAccounts] = useState([]);

    // Ref para identificar si el usuario acaba de iniciar sesión manualmente
    const isLoginAction = useRef(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { loginUser, user, logout } = useUser();

    // Función para determinar la ruta según el rol
    const roleToRoute = (rol) => {
        const r = (rol || '').toLowerCase();
        if (r.includes('administrador')) return '/inicioadmin';
        if (r.includes('aprendiz')) return '/aprendiz/inicio';
        if (r.includes('instructor')) return '/instructor/inicio';
        if (r.includes('coordinacion') || r.includes('coordinación') || r.includes('coordinador')) return '/coordinacion/inicio';
        if (r.includes('vigilante')) return '/Vigilante/Inicio';
        return '/login';
    };

    // Redirigir a dashboard si ya está autenticado
    useEffect(() => {
        if (!user.isLoading && user.isAuthenticated && !isLoginAction.current && user.profile) {
            // Redirigir al usuario a su dashboard correspondiente
            const route = roleToRoute(user.profile.nombre_rol);
            navigate(route, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.isAuthenticated, user.isLoading, user.profile]);

    const cerrarModalInactivo = () => {
        setShowInactiveModal(false);
    };

    const alertaInactivo = (event, rol) => {
        event.preventDefault();
        alert(`No puedes iniciar sesión como ${rol}. Esta cuenta se encuentra inactiva.`);
    };

    const handleAccountSelection = async (id_usuario) => {
        try {
            const data = await selectAccountApi(id_usuario);
            if (data.status === 'inactive') {
                setShowInactiveModal(true);
                return;
            }
            if (data.status !== 'ok') {
                setErrorMessage(data.message || 'Error al seleccionar cuenta');
                return;
            }
            // Marcar que es una acción de login intencional
            isLoginAction.current = true;
            await loginUser(data.token);
            setShowMultiAccountModal(false);
            navigate(roleToRoute(data.rol));
        } catch (err) {
            setErrorMessage('Error de red al seleccionar cuenta');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('🔍 handleSubmit ejecutado - documento:', documento, 'password:', password ? '***' : 'vacío');
        setErrorMessage(null);

        try {
            console.log('🌐 Llamando a loginApi...');
            const data = await loginApi(documento, password);
            console.log('✅ Respuesta de loginApi:', data);

            if (data.status === 'inactive') {
                console.log('⚠️ Cuenta inactiva');
                setShowInactiveModal(true);
                return;
            }
            if (data.status === 'error') {
                console.log('❌ Error de login:', data.message);
                setErrorMessage(data.message || 'Error en inicio de sesión');
                return;
            }
            if (data.status === 'multi') {
                console.log('👥 Múltiples cuentas detectadas');
                setMultiAccounts(data.accounts);
                setShowMultiAccountModal(true);
                return;
            }
            if (data.status === 'ok') {
                console.log('✅ Login exitoso, redirigiendo...');
                // Marcar que es una acción de login intencional
                isLoginAction.current = true;
                await loginUser(data.token);
                navigate(roleToRoute(data.rol));
            }
        } catch (err) {
            console.error('💥 Error en handleSubmit:', err);
            setErrorMessage(err.message || 'Error de red. Intente de nuevo más tarde.');
        }
    };

    return (
        <div className="background-container">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <img className="logosena" src={siccsLogo} alt="logo del SENA"/>
                        <h1 className="titulo-bienvenida">Portal de Acceso <span className="sena-label">SENA</span></h1>
                        <p className="subtitulo">Control de Salidas Aprendices</p>
                    </div>

                    {errorMessage && (
                        <div className="error-message">
                            <i className="fas fa-exclamation-circle"></i> {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group-v2">
                            <i className="fas fa-user input-icon"></i>
                            <input
                                type="text"
                                id="documento"
                                name="documento"
                                placeholder="Documento de Identidad"
                                value={documento}
                                onChange={(e) => setDocumento(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-group-v2">

                            <i className="fas fa-lock input-icon"></i>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="opciones">
                            <label>
                                <input type="checkbox" /> Recordarme
                            </label>
                            <Link to="/login/claveolvidada" className="enlace-olvido">¿Olvidaste tu clave?</Link>
                        </div>

                        <button type="submit" className="btn-login-v2">
                            ACCEDER
                        </button>
                    </form>

                    <p className="footer-login">
                        Si tiene problemas de acceso, contacte a soporte.
                    </p>
                </div>
            </div>

            {/* Modal de Cuenta Inactiva */}
            {showInactiveModal && (
                <div id="modalInactivo" className="modal-overlay-login" style={{ display: 'flex' }}>
                    <div className="modal-content-login">
                        <i className="fas fa-user-slash" style={{ fontSize: '2.5em', color: '#ff0019ff', marginBottom: '15px' }}></i>
                        <h3>Cuenta Desactivada</h3>
                        <p>Su cuenta se encuentra inactiva. Por favor, contacte con el área de Coordinación o Administración para su reactivación.</p>

                        <button type="button" className="btn-modal-login" onClick={cerrarModalInactivo}>
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Múltiples Cuentas */}
            {showMultiAccountModal && multiAccounts.length > 0 && (
                <div id="modalMultiCuenta" className="modal-overlay-login" style={{ display: 'flex' }}>
                    <div className="modal-content-login">
                        <i className="fas fa-exclamation-triangle" style={{ fontSize: '2.5em', color: '#ffc107', marginBottom: '15px' }}></i>
                        <h3>Múltiples Cuentas Detectadas</h3>
                        <p>Se ha encontrado más de una cuenta asociada a sus credenciales. Seleccione el rol con el que desea iniciar sesión:</p>
                        <div className="account-selector">
                            {multiAccounts.map((cuenta, index) => {
                                const isActive = cuenta.estado.toLowerCase() === 'activo';
                                const className = isActive ? 'active-role' : 'inactive-role';
                                const tag = isActive
                                    ? <span className="active-tag">ACTIVO</span>
                                    : <span className="inactive-tag">INACTIVO</span>;

                                return (
                                    <div
                                        key={index}
                                        className={`account-option ${className}`}
                                        data-id={cuenta.id_usuario}
                                        data-rol={cuenta.nombre_rol}
                                        onClick={isActive
                                            ? () => handleAccountSelection(cuenta.id_usuario)
                                            : (e) => alertaInactivo(e, cuenta.nombre_rol)
                                        }
                                    >
                                        <span><i className="fas fa-user-tag"></i> {cuenta.nombre_rol}</span>
                                        {tag}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, width: '100%' }}>
            </div>
        </div>
    );
}