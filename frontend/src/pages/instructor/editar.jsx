import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';
import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

export default function EditarInstructor() {
    const { user, logout } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [perfilData, setPerfilData] = useState(null);

    // Estados para modales
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Estados para actualizar correo
    const [nuevoCorreo, setNuevoCorreo] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState('');
    const [loadingEmail, setLoadingEmail] = useState(false);

    // Estados para cambiar contraseña
    const [contrasenaActual, setContrasenaActual] = useState('');
    const [contrasenaNueva, setContrasenaNueva] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    useEffect(() => {
        fetchPerfilData();
    }, []);

    const fetchPerfilData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/perfil`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setPerfilData(data.perfil);
            }
        } catch (error) {
            console.error('Error al cargar perfil:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleActualizarCorreo = async (e) => {
        e.preventDefault();
        setEmailError('');
        setEmailSuccess('');

        // Validar que el correo no sea el mismo
        if (nuevoCorreo === perfilData?.correo) {
            setEmailError('Error, el correo al actualizar es el mismo que el correo actual');
            return;
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(nuevoCorreo)) {
            setEmailError('Por favor ingresa un correo electrónico válido');
            return;
        }

        setLoadingEmail(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/actualizar-correo`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nuevo_correo: nuevoCorreo })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                setEmailSuccess('Correo actualizado exitosamente');
                setPerfilData({ ...perfilData, correo: nuevoCorreo });
                setTimeout(() => {
                    setShowEmailModal(false);
                    setNuevoCorreo('');
                    setEmailSuccess('');
                }, 2000);
            } else {
                setEmailError(data.message || 'Error al actualizar correo');
            }
        } catch (error) {
            setEmailError('Error de conexión al actualizar correo');
        } finally {
            setLoadingEmail(false);
        }
    };

    const handleCambiarContrasena = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (!contrasenaActual || !contrasenaNueva) {
            setPasswordError('Por favor completa todos los campos');
            return;
        }

        setLoadingPassword(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/cambiar-contrasena`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    contrasena_actual: contrasenaActual,
                    contrasena_nueva: contrasenaNueva
                })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                // Cerrar sesión y redirigir al login
                logout();
                navigate('/login', { replace: true });
            } else {
                setPasswordError(data.message || 'Contraseña incorrecta, vuelve a intentarlo');
            }
        } catch (error) {
            setPasswordError('Error de conexión al cambiar contraseña');
        } finally {
            setLoadingPassword(false);
        }
    };

    const handleOlvidoContrasena = () => {
        // Cerrar sesión y redirigir a clave olvidada
        logout();
        navigate('/login/claveolvidada', { replace: true });
        // Prevenir retroceso
        window.history.pushState(null, '', window.location.href);
        window.onpopstate = () => {
            window.history.pushState(null, '', window.location.href);
        };
    };

    if (loading) {
        return (
            <DashboardLayout title="Editar Perfil">
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <i className="fas fa-spinner fa-spin text-4xl text-[#39A900]"></i>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Editar Perfil">
            <div className="min-h-screen bg-gray-50 p-8 pt-18">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-[#39A900] text-white p-4 rounded-full">
                                <i className="fas fa-user-edit text-3xl"></i>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[#2A7D00]">Mi Perfil</h1>
                                <p className="text-gray-600">Gestiona tu información personal</p>
                            </div>
                        </div>

                        {/* Datos del Instructor - Solo Lectura */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <label className="block text-sm font-semibold text-gray-600 mb-2">
                                    <i className="fas fa-user mr-2"></i>Nombre Completo
                                </label>
                                <p className="text-lg font-semibold text-gray-800 break-words">
                                    {perfilData?.nombre} {perfilData?.apellido}
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <label className="block text-sm font-semibold text-gray-600 mb-2">
                                    <i className="fas fa-id-card mr-2"></i>Documento
                                </label>
                                <p className="text-lg font-semibold text-gray-800 break-words">
                                    {perfilData?.tipo_documento} {perfilData?.documento}
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <label className="block text-sm font-semibold text-gray-600 mb-2">
                                    <i className="fas fa-envelope mr-2"></i>Correo Electrónico
                                </label>
                                <p className="text-xs sm:text-lg font-semibold text-gray-800 break-words">

                                    {perfilData?.correo}
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <label className="block text-sm font-semibold text-gray-600 mb-2">
                                    <i className="fas fa-user-tag mr-2"></i>Perfil
                                </label>
                                <p className="text-lg font-semibold text-gray-800 break-words">
                                    {perfilData?.nombre_rol}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Opciones de Edición */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-[#2A7D00] mb-4">
                            <i className="fas fa-cog mr-2"></i>Configuración de Cuenta
                        </h2>

                        <div className="space-y-4">
                            {/* Actualizar Correo */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition gap-4">
                                <div className="w-full sm:w-auto">
                                    <h3 className="font-semibold text-gray-800">
                                        <i className="fas fa-envelope text-[#17a2b8] mr-2"></i>
                                        Actualizar Correo Electrónico
                                    </h3>
                                    <p className="text-sm text-gray-600">Cambia tu dirección de correo electrónico</p>
                                </div>
                                <button
                                    onClick={() => setShowEmailModal(true)}
                                    className="w-full sm:w-auto bg-[#17a2b8] text-white px-6 py-2 rounded-lg hover:bg-[#138496] transition font-semibold"
                                >
                                    Actualizar
                                </button>
                            </div>

                            {/* Cambiar Contraseña */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition gap-4">
                                <div className="w-full sm:w-auto">
                                    <h3 className="font-semibold text-gray-800">
                                        <i className="fas fa-lock text-[#ffc107] mr-2"></i>
                                        Cambiar Contraseña
                                    </h3>
                                    <p className="text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
                                </div>
                                <button
                                    onClick={() => setShowPasswordModal(true)}
                                    className="w-full sm:w-auto bg-[#ffc107] text-white px-6 py-2 rounded-lg hover:bg-[#e0a800] transition font-semibold"
                                >
                                    Cambiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal de Actualizar Correo */}
                {showEmailModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-[#2A7D00]">
                                    <i className="fas fa-envelope mr-2"></i>Actualizar Correo
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowEmailModal(false);
                                        setNuevoCorreo('');
                                        setEmailError('');
                                        setEmailSuccess('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    &times;
                                </button>
                            </div>

                            <form onSubmit={handleActualizarCorreo}>
                                {/* Correo Actual */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Correo Actual
                                    </label>
                                    <input
                                        type="email"
                                        value={perfilData?.correo || ''}
                                        disabled
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* Nuevo Correo */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Nuevo Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={nuevoCorreo}
                                        onChange={(e) => setNuevoCorreo(e.target.value)}
                                        onInput={(e) => {
                                            // Solo permitir A-Za-z0-9@._-
                                            e.target.value = e.target.value.replace(/[^A-Za-z0-9@._-]/g, '');
                                        }}
                                        pattern="[A-Za-z0-9@._-]+"
                                        maxLength={100}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17a2b8]"
                                        placeholder="ejemplo@correo.com"
                                        required
                                    />
                                </div>

                                {/* Mensajes */}
                                {emailError && (
                                    <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
                                        <p className="text-sm">{emailError}</p>
                                    </div>
                                )}

                                {emailSuccess && (
                                    <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded">
                                        <p className="text-sm">{emailSuccess}</p>
                                    </div>
                                )}

                                {/* Botones */}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEmailModal(false);
                                            setNuevoCorreo('');
                                            setEmailError('');
                                            setEmailSuccess('');
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loadingEmail}
                                        className="flex-1 bg-[#17a2b8] text-white px-4 py-3 rounded-lg hover:bg-[#138496] transition font-semibold disabled:opacity-50"
                                    >
                                        {loadingEmail ? (
                                            <i className="fas fa-spinner fa-spin"></i>
                                        ) : (
                                            'Actualizar'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal de Cambiar Contraseña */}
                {showPasswordModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-[#2A7D00]">
                                    <i className="fas fa-lock mr-2"></i>Cambiar Contraseña
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setContrasenaActual('');
                                        setContrasenaNueva('');
                                        setPasswordError('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    &times;
                                </button>
                            </div>

                            <form onSubmit={handleCambiarContrasena}>
                                {/* Contraseña Actual */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Contraseña Actual
                                    </label>
                                    <input
                                        type="password"
                                        value={contrasenaActual}
                                        onChange={(e) => setContrasenaActual(e.target.value)}
                                        onInput={(e) => {
                                            // Solo permitir A-Za-zÁ-Úá-úñÑ0-9@#$%&*\-_+
                                            e.target.value = e.target.value.replace(/[^A-Za-zÁ-Úá-úñÑ0-9@#$%&*\-_+]/g, '');
                                        }}
                                        minLength={6}
                                        maxLength={100}
                                        pattern="[A-Za-zÁ-Úá-úñÑ0-9@#$%&*\-_+]{6,100}"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffc107]"
                                        placeholder="Ingresa tu contraseña actual"
                                        required
                                    />
                                    {passwordError && passwordError.includes('incorrecta') && (
                                        <p className="text-red-600 text-sm mt-1">
                                            <i className="fas fa-exclamation-circle mr-1"></i>
                                            {passwordError}
                                        </p>
                                    )}
                                </div>

                                {/* Contraseña Nueva */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Nueva Contraseña (Mínimo 6 caracteres)
                                    </label>
                                    <input
                                        type="password"
                                        value={contrasenaNueva}
                                        onChange={(e) => setContrasenaNueva(e.target.value)}
                                        onInput={(e) => {
                                            // Solo permitir A-Za-zÁ-Úá-úñÑ0-9@#$%&*\-_+
                                            e.target.value = e.target.value.replace(/[^A-Za-zÁ-Úá-úñÑ0-9@#$%&*\-_+]/g, '');
                                        }}
                                        minLength={6}
                                        maxLength={100}
                                        pattern="[A-Za-zÁ-Úá-úñÑ0-9@#$%&*\-_+]{6,100}"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffc107]"
                                        placeholder="Ingresa tu nueva contraseña"
                                        required
                                    />
                                </div>

                                {/* Mensaje de Error General */}
                                {passwordError && !passwordError.includes('incorrecta') && (
                                    <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
                                        <p className="text-sm">{passwordError}</p>
                                    </div>
                                )}

                                {/* Link Olvidó Contraseña */}
                                <div className="mb-4 text-center">
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleOlvidoContrasena();
                                        }}
                                        className="text-[#17a2b8] hover:underline text-sm font-semibold"
                                    >
                                        ¿Se me olvidó la contraseña?
                                    </a>
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordModal(false);
                                            setContrasenaActual('');
                                            setContrasenaNueva('');
                                            setPasswordError('');
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loadingPassword}
                                        className="flex-1 bg-[#ffc107] text-white px-4 py-3 rounded-lg hover:bg-[#e0a800] transition font-semibold disabled:opacity-50"
                                    >
                                        {loadingPassword ? (
                                            <i className="fas fa-spinner fa-spin"></i>
                                        ) : (
                                            'Confirmar'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}