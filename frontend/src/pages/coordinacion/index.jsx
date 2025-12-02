import React, { useState, useEffect, useRef } from 'react';
import { useSound } from '../../contexts/SoundContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';

import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

const InicioCoordinacion = () => {
    const { user } = useUser();

    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [showSoporteModal, setShowSoporteModal] = useState(false);
    const [showAprobarModal, setShowAprobarModal] = useState(false);
    const [showRechazarModal, setShowRechazarModal] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [notification, setNotification] = useState(null);

    const { playNotificationSound, soundEnabled } = useSound();
    const previousCountRef = useRef(-1);
    const cargarSolicitudes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/coordinacion/solicitudes-pendientes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            console.log('Datos recibidos en Coordinación:', data);
            if (data.status === 'ok') {
                const newCount = data.solicitudes.length;
                const prevCount = previousCountRef.current;

                if (prevCount === -1) {
                    previousCountRef.current = newCount;
                } else if (newCount > prevCount) {
                    console.log('🔔 Nueva solicitud detectada!');
                    playNotificationSound();
                    setNotification({ type: 'success', message: '🔔 Nueva solicitud recibida!' });
                    setTimeout(() => setNotification(null), 4000);
                    previousCountRef.current = newCount;
                } else {
                    previousCountRef.current = newCount;
                }

                setSolicitudes(data.solicitudes);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarSolicitudes();
        const interval = setInterval(cargarSolicitudes, 5000);
        return () => clearInterval(interval);
    }, []);

    const getTimeAgo = (fecha) => {
        const now = new Date();
        const past = new Date(fecha);
        const diff = Math.floor((now - past) / 1000);

        if (diff < 60) return "hace un momento";
        if (diff < 120) return "hace 1 minuto";
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
        if (diff < 7200) return "hace 1 hora";
        return `hace ${Math.floor(diff / 3600)} horas`;
    };

    const getMotivoTexto = (motivo, descripcion) => {
        const motivoNormalizado = (motivo || '').toString().trim().toLowerCase();
        const motivos = {
            'cita_medica': 'Cita o incapacidad médica',
            'electoral': 'Diligencias electorales/gubernamentales',
            'laboral': 'Requerimientos o compromisos laborales',
            'fuerza_mayor': 'Casos fortuitos o de fuerza mayor',
            'etapa_productiva': 'Trámites de etapa productiva',
            'representacion_sena': 'Asistencia en representación del SENA',
            'diligencia_judicial': 'Citación a diligencias judiciales',
            'otros': 'Otros'
        };

        let texto = motivos[motivoNormalizado] || motivo || 'Motivo Desconocido';
        if ((motivoNormalizado === 'otros' || motivoNormalizado === 'otro') && descripcion) {
            texto += `: ${descripcion}`;
        }
        return texto;
    };

    const formatTime12h = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'p.m.' : 'a.m.';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const formatFecha = (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatFechaHora = (fechaStr) => {
        if (!fechaStr) return '-';
        const fecha = new Date(fechaStr);
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const año = fecha.getFullYear();
        const horas = fecha.getHours();
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        const ampm = horas >= 12 ? 'p.m.' : 'a.m.';
        const horas12 = horas % 12 || 12;
        return `${horas12}:${minutos} ${ampm} - ${dia}/${mes}/${año}`;
    };

    const aprobarSolicitud = async () => {
        if (!selectedSolicitud) return;
        setProcesando(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/coordinacion/aprobar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id_permiso: selectedSolicitud.id_permiso })
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setSolicitudes(prev => prev.filter(s => s.id_permiso !== selectedSolicitud.id_permiso));
                setShowAprobarModal(false);
                setShowDetallesModal(false);
                setSelectedSolicitud(null);
                setNotification({ type: 'success', message: '✅ Solicitud aprobada exitosamente y código QR generado' });
                setTimeout(() => setNotification(null), 5000);
            } else {
                setNotification({ type: 'error', message: 'Error: ' + data.message });
                setTimeout(() => setNotification(null), 5000);
            }
        } catch (error) {
            console.error('Error:', error);
            setNotification({ type: 'error', message: 'Error de conexión' });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setProcesando(false);
        }
    };

    const rechazarSolicitud = async () => {
        if (!selectedSolicitud || !motivoRechazo.trim()) {
            setNotification({ type: 'error', message: 'Por favor, especifique el motivo del rechazo' });
            setTimeout(() => setNotification(null), 5000);
            return;
        }

        setProcesando(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/coordinacion/rechazar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_permiso: selectedSolicitud.id_permiso,
                    motivo_rechazo: motivoRechazo
                })
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setSolicitudes(prev => prev.filter(s => s.id_permiso !== selectedSolicitud.id_permiso));
                setShowRechazarModal(false);
                setShowDetallesModal(false);
                setSelectedSolicitud(null);
                setMotivoRechazo('');
                setNotification({ type: 'success', message: '❌ Solicitud rechazada exitosamente' });
                setTimeout(() => setNotification(null), 5000);
            } else {
                setNotification({ type: 'error', message: 'Error: ' + data.message });
                setTimeout(() => setNotification(null), 5000);
            }
        } catch (error) {
            console.error('Error:', error);
            setNotification({ type: 'error', message: 'Error de conexión' });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setProcesando(false);
        }
    };

    return (
        <DashboardLayout title="Portal de Coordinación">
            {/* Notificación flotante */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[2000] px-6 py-4 rounded-lg shadow-2xl animate-[slideIn_0.3s_ease-out] ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    <p className="font-semibold">{notification.message}</p>
                </div>
            )}

            <div className="flex gap-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">

                <div className="flex-1">
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-l-4 border-l-indigo-600">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                    Solicitudes Pendientes de Aprobación Final
                                </h2>
                                <p className="text-gray-600">Gestiona las solicitudes aprobadas por instructores</p>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-2xl">
                                <span className="text-3xl font-bold">{solicitudes.length}</span>
                            </div>
                        </div>

                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
                        </div>
                    ) : solicitudes.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                            <i className="fas fa-check-circle text-6xl text-indigo-600 mb-4"></i>
                            <p className="text-xl text-gray-600">No hay solicitudes pendientes de aprobación final</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold">Aprendiz</th>
                                        <th className="px-6 py-4 text-left font-semibold">Formación</th>
                                        <th className="px-6 py-4 text-left font-semibold">Instructor</th>
                                        <th className="px-6 py-4 text-left font-semibold">Tiempo</th>
                                        <th className="px-6 py-4 text-center font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {solicitudes.map((solicitud, index) => (
                                        <tr
                                            key={solicitud.id_permiso}
                                            className={`border-b hover:bg-indigo-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                                        {solicitud.nombre_aprendiz.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">
                                                            {solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}
                                                        </p>
                                                        <p className="text-sm text-gray-500">Doc: {solicitud.documento_aprendiz}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-800">{solicitud.nombre_programa}</p>
                                                <p className="text-sm text-gray-500">Ficha: {solicitud.numero_ficha}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <i className="fas fa-check-circle text-green-500"></i>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">
                                                            {solicitud.nombre_instructor} {solicitud.apellido_instructor}
                                                        </p>
                                                        <p className="text-xs text-gray-500">Aprobada</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                                                    <i className="fas fa-clock text-gray-400"></i>
                                                    {getTimeAgo(solicitud.fecha_solicitud)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSolicitud(solicitud);
                                                        setShowDetallesModal(true);
                                                    }}
                                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
                                                >
                                                    <i className="fas fa-eye mr-2"></i>
                                                    Ver detalles
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="w-[35%] space-y-4">

                    <Link to="/coordinacion/editarperfil" className="block w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-lg text-center">
                        <i className="fas fa-user-edit mr-2"></i>
                        Editar Perfil
                    </Link>
                    <Link to="/coordinacion/historial" className="block w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-lg text-center">
                        <i className="fas fa-history mr-2"></i>
                        Historial de Salidas
                    </Link>
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h3 className="font-bold text-gray-800 mb-2">Solicitudes Recibidas</h3>
                        <p className="text-4xl font-bold text-indigo-600">{solicitudes.length}</p>
                        <p className="text-sm text-gray-500 mt-1">Pendientes de aprobación</p>
                    </div>
                </div>
            </div>

            {/* Modal de Detalles */}
            {showDetallesModal && selectedSolicitud && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pt-20 p-4" onClick={() => !procesando && setShowDetallesModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-[modalAppear_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">Detalles de la Solicitud</h2>
                                {!procesando && (
                                    <button onClick={() => setShowDetallesModal(false)} className="text-white hover:text-gray-200 text-3xl">&times;</button>
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Aprendiz y Fecha de Solicitud */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-indigo-600 uppercase font-semibold mb-2">Aprendiz</p>
                                    <p className="font-bold text-gray-800">{selectedSolicitud.nombre_aprendiz} {selectedSolicitud.apellido_aprendiz}</p>
                                    <p className="text-sm text-gray-600">Doc: {selectedSolicitud.documento_aprendiz}</p>
                                    <p className="text-sm text-gray-600 mt-2">Programa: {selectedSolicitud.nombre_programa}</p>
                                    <p className="text-sm text-gray-600">Ficha: {selectedSolicitud.numero_ficha}</p>
                                    <p className="text-sm text-gray-600">Jornada: {selectedSolicitud.nombre_jornada || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Fecha de Solicitud</p>
                                    <p className="font-bold text-gray-800">{formatFechaHora(selectedSolicitud.fecha_solicitud)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Hora Salida</p>
                                    <p className="font-semibold text-gray-800">{formatTime12h(selectedSolicitud.hora_salida)}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Hora Regreso</p>
                                    <p className="font-semibold text-gray-800">{formatTime12h(selectedSolicitud.hora_regreso)}</p>
                                </div>
                                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg col-span-2">
                                    <p className="text-xs text-green-700 uppercase font-semibold mb-1">Aprobada por Instructor</p>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {selectedSolicitud.nombre_instructor} {selectedSolicitud.apellido_instructor}
                                    </p>
                                </div>
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg col-span-2">
                                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Motivo</p>
                                    <p className="text-sm text-gray-800 italic">{getMotivoTexto(selectedSolicitud.motivo, selectedSolicitud.motivo_otros)}</p>
                                </div>

                                {selectedSolicitud.soporte && (
                                    <div className="col-span-2">
                                        <button
                                            onClick={() => setShowSoporteModal(true)}
                                            className="w-full bg-white text-blue-600 border border-blue-600 py-2 rounded-lg font-bold hover:bg-blue-50 transition-all duration-300 flex items-center justify-center gap-2"
                                        >
                                            <span>📎</span> Visualizar Soporte Adjunto
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDetallesModal(false);
                                    setShowAprobarModal(true);
                                }}
                                disabled={procesando}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                            >
                                <i className="fas fa-check mr-2"></i>Aprobar Final
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetallesModal(false);
                                    setShowRechazarModal(true);
                                }}
                                disabled={procesando}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                            >
                                <i className="fas fa-times mr-2"></i>Rechazar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Soporte */}
            {showSoporteModal && selectedSolicitud?.soporte && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[10000] flex justify-center items-center backdrop-blur-sm p-4" onClick={() => setShowSoporteModal(false)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowSoporteModal(false)}
                            className="absolute -top-10 right-0 text-white text-4xl hover:text-gray-300 focus:outline-none"
                        >
                            &times;
                        </button>
                        <img
                            src={`${API}/${selectedSolicitud.soporte}`}
                            alt="Soporte de la solicitud"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* Modal de Aprobación */}
            {showAprobarModal && selectedSolicitud && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pt-20 p-4" onClick={() => !procesando && setShowAprobarModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[modalAppear_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">Confirmación de Aprobación Final</h2>
                                {!procesando && (
                                    <button onClick={() => setShowAprobarModal(false)} className="text-white hover:text-gray-200 text-3xl">&times;</button>
                                )}
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">Se generará un código QR para la salida del aprendiz:</p>
                            <div className="bg-green-50 p-4 rounded-lg mb-4 border-l-4 border-green-500">
                                <p className="font-semibold text-gray-800">{selectedSolicitud.nombre_aprendiz} {selectedSolicitud.apellido_aprendiz}</p>
                                <p className="text-sm text-gray-600">{getMotivoTexto(selectedSolicitud.motivo, selectedSolicitud.motivo_otros)}</p>
                            </div>
                            <button
                                onClick={aprobarSolicitud}
                                disabled={procesando}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                            >
                                {procesando ? <><i className="fas fa-spinner fa-spin mr-2"></i>Procesando...</> : <><i className="fas fa-check mr-2"></i>Confirmar Aprobación</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Rechazo */}
            {showRechazarModal && selectedSolicitud && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pt-20 p-4" onClick={() => !procesando && setShowRechazarModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[modalAppear_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">Motivo de Rechazo</h2>
                                {!procesando && (
                                    <button onClick={() => setShowRechazarModal(false)} className="text-white hover:text-gray-200 text-3xl">&times;</button>
                                )}
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">Especifique la razón del rechazo definitivo:</p>
                            <textarea
                                value={motivoRechazo}
                                onChange={(e) => setMotivoRechazo(e.target.value)}
                                rows="4"
                                placeholder="Escriba el motivo aquí..."
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none resize-none mb-4"
                                disabled={procesando}
                            />
                            <button
                                onClick={rechazarSolicitud}
                                disabled={procesando || !motivoRechazo.trim()}
                                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {procesando ? <><i className="fas fa-spinner fa-spin mr-2"></i>Procesando...</> : <><i className="fas fa-ban mr-2"></i>Confirmar Rechazo</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalAppear {
                    from { opacity: 0; transform: scale(0.9) translateY(-20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </DashboardLayout >
    );
};

export default InicioCoordinacion;
