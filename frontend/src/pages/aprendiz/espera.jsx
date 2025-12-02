import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';

import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

const EsperaSolicitud = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const [estadoSolicitud, setEstadoSolicitud] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSoporteModal, setShowSoporteModal] = useState(false);

    // Estado local para los datos de la solicitud (puede venir de location o fetch)
    const [localSolicitudData, setLocalSolicitudData] = useState(location.state?.solicitudData || null);
    const idPermiso = location.state?.id_permiso || null;

    // Consultar estado de la solicitud
    const consultarEstado = async () => {
        if (!idPermiso) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/aprendiz/solicitud/${idPermiso}/estado`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setEstadoSolicitud(data.solicitud);

                // Si no tenemos datos locales (ej: recarga de página), intentar reconstruirlos o usar los del estado
                if (!localSolicitudData) {
                    // Aquí podríamos hacer otro fetch si el endpoint de estado no devuelve todo
                    // Por ahora, usaremos lo que devuelve 'estado' que tiene info básica
                    setLocalSolicitudData({
                        nombre_instructor: data.solicitud.nombre_instructor + ' ' + data.solicitud.apellido_instructor,
                        nombre_aprendiz: user.profile?.nombre ? `${user.profile.nombre} ${user.profile.apellido}` : 'Cargando...',
                        documento_aprendiz: user.profile?.documento || 'Cargando...',
                        nombre_programa: user.profile?.programa?.nombre_programa || 'N/A',
                        numero_ficha: user.profile?.programa?.numero_ficha || 'N/A',
                        fecha_salida: data.solicitud.fecha_solicitud, // Aproximado
                        hora_salida: data.solicitud.hora_salida,
                        motivo_mostrar: data.solicitud.motivo
                    });
                }
            }
        } catch (err) {
            console.error('Error al consultar estado:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Si no hay ID, redirigir
        if (!idPermiso) {
            navigate('/aprendiz/inicio');
            return;
        }

        // Consultar estado inicial
        consultarEstado();

        // Polling cada 10 segundos
        const interval = setInterval(consultarEstado, 10000);

        return () => {
            clearInterval(interval);
        };
    }, [idPermiso, navigate]);

    // Efecto para actualizar datos del usuario si cargan tarde
    useEffect(() => {
        if (user.profile && localSolicitudData && (localSolicitudData.nombre_aprendiz === 'Cargando...' || localSolicitudData.nombre_aprendiz.includes('undefined'))) {
            setLocalSolicitudData(prev => ({
                ...prev,
                nombre_aprendiz: `${user.profile.nombre} ${user.profile.apellido}`,
                documento_aprendiz: user.profile.documento,
                nombre_programa: user.profile.programa?.nombre_programa || 'N/A',
                numero_ficha: user.profile.programa?.numero_ficha || 'N/A',
            }));
        }
    }, [user.profile]);


    const handleVolverInicio = () => {
        navigate('/aprendiz/inicio');
    };

    if (loading && !localSolicitudData) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div></div>;
    }

    if (!localSolicitudData) return null;

    // Determinar estado visual
    const getEstadoVisual = () => {
        if (!estadoSolicitud) return { texto: 'Consultando...', color: 'gray', icono: '⏳' };

        const estado = estadoSolicitud.estado_general;

        if (estado === 'Pendiente Instructor') {
            return {
                texto: 'Esperando aprobación del instructor',
                color: 'yellow',
                icono: '⏳',
                detalle: `Instructor: ${localSolicitudData.nombre_instructor}`
            };
        }

        if (estado === 'Pendiente Coordinador') {
            return {
                texto: '✅ Aprobada por instructor - Esperando coordinación',
                color: 'blue',
                icono: '👍',
                detalle: `Aprobada por: ${estadoSolicitud.nombre_instructor} ${estadoSolicitud.apellido_instructor}`
            };
        }

        if (estado === 'Aprobado Final') {
            return {
                texto: '✅ ¡APROBADA! Solicitud completamente aprobada',
                color: 'green',
                icono: '🎉',
                detalle: `Coordinador: ${estadoSolicitud.nombre_coordinador} ${estadoSolicitud.apellido_coordinador}`,
                qr: estadoSolicitud.qr_code
            };
        }

        if (estado === 'Rechazado') {
            const rechazadoPor = estadoSolicitud.estado_instructor === 'Rechazado' ? 'Instructor' : 'Coordinador';
            const motivo = estadoSolicitud.motivo_rechazo_instructor || estadoSolicitud.motivo_rechazo_coordinador || 'No especificado';

            return {
                texto: `❌ Solicitud rechazada por ${rechazadoPor}`,
                color: 'red',
                icono: '❌',
                detalle: `Motivo: ${motivo}`
            };
        }

        if (estado === 'Cancelada') {
            return {
                texto: '❌ Solicitud Cancelada',
                color: 'red',
                icono: '🚫',
                detalle: 'Has cancelado esta solicitud.'
            };
        }

        return { texto: estado, color: 'gray', icono: '📋' };
    };

    const formatTime12h = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const estadoVisual = getEstadoVisual();

    return (
        <DashboardLayout title="Estado de Solicitud">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="max-w-[900px] mx-auto">

                    {/* Estado Actual */}
                    <div className={`bg-white rounded-2xl p-6 mb-6 shadow-lg border-l-4 ${estadoVisual.color === 'green' ? 'border-l-green-500' :
                        estadoVisual.color === 'blue' ? 'border-l-blue-500' :
                            estadoVisual.color === 'yellow' ? 'border-l-yellow-500' :
                                estadoVisual.color === 'red' ? 'border-l-red-500' : 'border-l-gray-500'
                        }`}>
                        <div className="flex items-center gap-4">
                            <span className="text-5xl">{estadoVisual.icono}</span>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                    {estadoVisual.texto}
                                </h2>
                                {estadoVisual.detalle && (
                                    <p className="text-gray-600">{estadoVisual.detalle}</p>
                                )}
                            </div>
                            {!loading && estadoVisual.color !== 'green' && estadoVisual.color !== 'red' && (
                                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
                            )}
                        </div>
                    </div>

                    {/* Código QR si está aprobada */}
                    {estadoVisual.qr && (
                        <div className="bg-white rounded-2xl p-8 mb-6 shadow-lg text-center">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Tu Código QR</h3>
                            <div className="bg-gray-100 p-6 rounded-lg inline-block">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(estadoVisual.qr)}`}
                                    alt="Código QR"
                                    className="mx-auto"
                                />
                            </div>
                            <p className="text-sm text-gray-600 mt-4">Presenta este código al salir</p>
                        </div>
                    )}

                    {/* Progreso Visual */}
                    <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Progreso de Aprobación</h3>
                        <div className="flex items-center justify-between">
                            {/* Instructor */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${estadoSolicitud?.estado_instructor === 'Aprobado' ? 'bg-green-500 text-white' :
                                    estadoSolicitud?.estado_instructor === 'Rechazado' ? 'bg-red-500 text-white' :
                                        'bg-yellow-500 text-white animate-pulse'
                                    }`}>
                                    {estadoSolicitud?.estado_instructor === 'Aprobado' ? '✓' :
                                        estadoSolicitud?.estado_instructor === 'Rechazado' ? '✗' : '⏳'}
                                </div>
                                <p className="text-sm font-semibold mt-2">Instructor</p>
                                <p className="text-xs text-gray-500">{localSolicitudData.nombre_instructor}</p>
                                <p className={`text-xs font-bold mt-1 ${estadoSolicitud?.estado_instructor === 'Aprobado' ? 'text-green-600' :
                                    estadoSolicitud?.estado_instructor === 'Rechazado' ? 'text-red-600' :
                                        'text-yellow-600'
                                    }`}>
                                    {estadoSolicitud?.estado_instructor === 'Aprobado' ? '✅ Aprobado' :
                                        estadoSolicitud?.estado_instructor === 'Rechazado' ? '❌ Rechazado' :
                                            '⏳ Pendiente'}
                                </p>
                            </div>

                            {/* Línea conectora */}
                            <div className={`flex-1 h-1 ${estadoSolicitud?.estado_instructor === 'Aprobado' ? 'bg-green-500' : 'bg-gray-300'
                                }`}></div>

                            {/* Coordinación */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${estadoSolicitud?.estado_instructor === 'Rechazado' ? 'bg-gray-400 text-white' :
                                    estadoSolicitud?.estado_coordinador === 'Aprobado' ? 'bg-green-500 text-white' :
                                        estadoSolicitud?.estado_coordinador === 'Rechazado' ? 'bg-red-500 text-white' :
                                            estadoSolicitud?.estado_general === 'Pendiente Coordinador' ? 'bg-yellow-500 text-white animate-pulse' :
                                                'bg-gray-300 text-gray-500'
                                    }`}>
                                    {estadoSolicitud?.estado_instructor === 'Rechazado' ? '🚫' :
                                        estadoSolicitud?.estado_coordinador === 'Aprobado' ? '✓' :
                                            estadoSolicitud?.estado_coordinador === 'Rechazado' ? '✗' : '⏳'}
                                </div>
                                <p className="text-sm font-semibold mt-2">Coordinación</p>
                                <p className="text-xs text-gray-500">
                                    {estadoSolicitud?.nombre_coordinador || 'Pendiente'}
                                </p>
                                <p className={`text-xs font-bold mt-1 ${estadoSolicitud?.estado_instructor === 'Rechazado' ? 'text-gray-600' :
                                    estadoSolicitud?.estado_coordinador === 'Aprobado' ? 'text-green-600' :
                                        estadoSolicitud?.estado_coordinador === 'Rechazado' ? 'text-red-600' :
                                            estadoSolicitud?.estado_general === 'Pendiente Coordinador' ? 'text-yellow-600' :
                                                'text-gray-500'
                                    }`}>
                                    {estadoSolicitud?.estado_instructor === 'Rechazado' ? '🚫 No permitido' :
                                        estadoSolicitud?.estado_coordinador === 'Aprobado' ? '✅ Aprobado' :
                                            estadoSolicitud?.estado_coordinador === 'Rechazado' ? '❌ Rechazado' :
                                                estadoSolicitud?.estado_general === 'Pendiente Coordinador' ? '⏳ Pendiente' :
                                                    '⏳ Pendiente'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Datos de la Solicitud */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
                            Datos de tu Solicitud
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-500 text-xs uppercase mb-1">Aprendiz:</span>
                                <span className="text-gray-800 text-lg p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                    {localSolicitudData.nombre_aprendiz}
                                </span>
                            </div>

                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-500 text-xs uppercase mb-1">Documento:</span>
                                <span className="text-gray-800 text-lg p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                    {localSolicitudData.documento_aprendiz}
                                </span>
                            </div>

                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-500 text-xs uppercase mb-1">Programa:</span>
                                <span className="text-gray-800 text-lg p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                    {localSolicitudData.nombre_programa}
                                </span>
                            </div>

                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-500 text-xs uppercase mb-1">Ficha:</span>
                                <span className="text-gray-800 text-lg p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                    {localSolicitudData.numero_ficha}
                                </span>
                            </div>

                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-500 text-xs uppercase mb-1">Fecha Salida:</span>
                                <span className="text-gray-800 text-lg p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                    {localSolicitudData.fecha_salida}
                                </span>
                            </div>

                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-500 text-xs uppercase mb-1">Hora Salida:</span>
                                <span className="text-gray-800 text-lg p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                    {formatTime12h(localSolicitudData.hora_salida)}
                                </span>
                            </div>

                            <div className="flex flex-col md:col-span-2">
                                <span className="font-semibold text-gray-500 text-xs uppercase mb-1">Motivo:</span>
                                <span className="text-gray-800 text-lg p-2 bg-yellow-50 rounded border-l-4 border-l-yellow-500 italic">
                                    {localSolicitudData.motivo_mostrar}
                                </span>
                            </div>
                        </div>

                        {/* Botón para ver soporte si existe */}
                        {estadoSolicitud?.soporte && (
                            <button
                                onClick={() => setShowSoporteModal(true)}
                                className="mt-4 w-full bg-white text-blue-600 border border-blue-600 py-2 rounded-lg font-bold hover:bg-blue-50 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <span>📎</span> Visualizar Soporte Adjunto
                            </button>
                        )}

                        <button
                            onClick={handleVolverInicio}
                            className="mt-6 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all duration-300"
                        >
                            Volver a Inicio
                        </button>
                    </div>
                </div>
            </div>


            {/* Modal de Soporte */}
            {showSoporteModal && estadoSolicitud?.soporte && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[1100] flex justify-center items-center backdrop-blur-sm p-4" onClick={() => setShowSoporteModal(false)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowSoporteModal(false)}
                            className="absolute -top-10 right-0 text-white text-4xl hover:text-gray-300 focus:outline-none"
                        >
                            &times;
                        </button>
                        <img
                            src={`${API}/${estadoSolicitud.soporte}`}
                            alt="Soporte de la solicitud"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default EsperaSolicitud;
