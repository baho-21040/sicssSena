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

                // Actualizar siempre los datos locales con la info fresca del backend
                setLocalSolicitudData(prev => ({
                    ...prev,
                    // Priorizar datos del backend si existen
                    nombre_instructor: data.solicitud.nombre_instructor + ' ' + data.solicitud.apellido_instructor,
                    documento_instructor: data.solicitud.documento_instructor,
                    fecha_salida: data.solicitud.fecha_solicitud,
                    hora_salida: data.solicitud.hora_salida,
                    hora_regreso: data.solicitud.hora_regreso,
                    motivo_mostrar: data.solicitud.descripcion || data.solicitud.motivo,

                    // Mantener datos del usuario si ya los tenemos, o usar fallbacks/cargando
                    nombre_aprendiz: prev?.nombre_aprendiz && !prev.nombre_aprendiz.includes('Cargando') ? prev.nombre_aprendiz : (user.profile?.nombre ? `${user.profile.nombre} ${user.profile.apellido}` : 'Cargando...'),
                    documento_aprendiz: prev?.documento_aprendiz && !prev.documento_aprendiz.includes('Cargando') ? prev.documento_aprendiz : (user.profile?.documento || 'Cargando...'),
                    nombre_programa: prev?.nombre_programa && prev.nombre_programa !== 'N/A' ? prev.nombre_programa : (user.profile?.programa?.nombre_programa || 'N/A'),
                    numero_ficha: prev?.numero_ficha && prev.numero_ficha !== 'N/A' ? prev.numero_ficha : (user.profile?.programa?.numero_ficha || 'N/A'),
                    jornada: prev?.jornada && prev.jornada !== 'N/A' ? prev.jornada : (user.profile?.programa?.nombre_jornada || 'N/A'),
                }));
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

    // Efecto para actualizar datos del usuario si cargan tarde o si cambiamos de perfil
    useEffect(() => {
        if (user.profile && localSolicitudData) {
            setLocalSolicitudData(prev => ({
                ...prev,
                nombre_aprendiz: `${user.profile.nombre} ${user.profile.apellido}`,
                documento_aprendiz: user.profile.documento,
                nombre_programa: user.profile.programa?.nombre_programa || 'N/A',
                numero_ficha: user.profile.programa?.numero_ficha || 'N/A',
                jornada: user.profile.programa?.nombre_jornada || 'N/A',
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

        if (estado === 'Pendiente Instructor(a)') {
            return {
                texto: 'Esperando aprobación del instructor',
                color: 'yellow',
                icono: <i className="fa-regular fa-clock "></i>,
                detalle: `Instructor(a): ${localSolicitudData.nombre_instructor}`
            };
        }

        if (estado === 'Pendiente Coordinador') {
            return {
                texto: 'Aprobada por instructor \nEsperando respuesta de coordinación.',
                color: 'blue',
                icono: <i className="fa-solid fa-thumbs-up" style={{ color: '#7d7d7d' }}></i>,
                detalle: `Aprobada por: ${estadoSolicitud.nombre_instructor} ${estadoSolicitud.apellido_instructor}`
            };
        }

        if (estado === 'Aprobado Final') {
            return {
                texto: 'ÉXITO! Solicitud completamente aprobada',
                color: 'green',
                icono: '🎉',
                detalle: `Coordinador(a):  \n${estadoSolicitud.nombre_coordinador} ${estadoSolicitud.apellido_coordinador}`,
                qr: estadoSolicitud.qr_code
            };
        }

        if (estado === 'Rechazado') {
            let rechazadoPor = estadoSolicitud.estado_instructor === 'Rechazado' ? 'Instructor' : 'Coordinador';
            let motivo = estadoSolicitud.motivo_rechazo_instructor || estadoSolicitud.motivo_rechazo_coordinador || 'No especificado';

            if (rechazadoPor === 'Coordinador' && (motivo === 'No especificado' || !motivo)) {
                rechazadoPor = 'el sistema';
                motivo = 'Tiempo de espera expirado';
            }

            return {
                texto: `Solicitud rechazada por ${rechazadoPor}`,
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
            {/* Estilos personalizados para el breakpoint de 500px exactos */}
            <style>{`
                .custom-grid-container {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }
                .custom-wrapper-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                .custom-full-width {
                    grid-column: span 1;
                }

                .titulo{
                        font-size: 10px;
                    }

                @media (min-width: 525px) {
                    .custom-grid-container {
                        grid-template-columns: 1fr 1fr;
                    }
                    .custom-wrapper-group {
                        display: contents;
                    }
                    .custom-full-width {
                        grid-column: span 2;
                    }
                    .custom-hidden-wide {
                        display: none;
                    }

                

                }
            `}</style>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="max-w-[900px] mx-auto">

                    {/* Estado Actual */}
                    <div className={`bg-white rounded-[90px] p-4 mb-6 shadow-lg border-l-4 ${estadoVisual.color === 'green' ? 'border-l-green-500' :
                        estadoVisual.color === 'blue' ? 'border-l-blue-500' :
                            estadoVisual.color === 'yellow' ? 'border-l-yellow-500' :
                                estadoVisual.color === 'red' ? 'border-l-red-500' : 'border-l-gray-500'
                        }`}>
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">{estadoVisual.icono}</span>
                            <div className="flex-1">
                                <h2 className="whitespace-pre-line text-lg  font-bold text-gray-800 mb-1 max-sm:text-sm">
                                    {estadoVisual.texto}
                                </h2>
                                {estadoVisual.detalle && (
                                    <p className="whitespace-pre-line text-gray-600 text-xs  sm:text-sm">{estadoVisual.detalle}</p>
                                )}
                            </div>
                            {!loading && estadoVisual.color !== 'green' && estadoVisual.color !== 'red' && (
                                /* Animación de carga para estados pendientes */
                                <div
                                    className="w-10 h-10 rounded-full animate-spin  sm:w-14 sm:h-14"
                                    style={{
                                        background: `radial-gradient(farthest-side, #39a900 94%, transparent) top/9px 9px no-repeat,conic-gradient(transparent 30%, #39a900)`,
                                        WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 9px), black 0)"
                                    }}
                                ></div>
                            )}
                        </div>
                    </div>

                    {/* Código QR si está aprobada */}
                    {estadoVisual.qr && (
                        <div className="bg-white rounded-2xl p-8 mb-6 shadow-lg text-center">
                            <h3 className="text-base font-bold text-gray-800 mb-4 sm:text-xl">Tu Código QR</h3>
                            <div className="bg-gray-200 p-6 rounded-lg inline-block">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(estadoVisual.qr)}`}

                                    alt="Soporte de la solicitud"
                                    className="mx-auto "
                                />
                            </div>
                            <p className="text-sm text-gray-600 mt-4">Presenta este código en portería.</p>
                        </div>
                    )}

                    {/* Progreso Visual */}
                    <div className="bg-white rounded-2xl p-4 mb-6 shadow-lg ">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Progreso de Aprobación</h3>
                        <div className="flex items-center justify-between">
                            {/* Instructor */}
                            <div className="flex flex-col items-center flex-1 min-h-[150px]">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${estadoSolicitud?.estado_instructor === 'Aprobado' ?
                                    'bg-[#39A900] text-white' :
                                    estadoSolicitud?.estado_instructor === 'Rechazado' ? 'bg-red-500 text-white' :
                                        'bg-yellow-400 text-white animate-pulse'
                                    }`}>
                                    {estadoSolicitud?.estado_instructor === 'Aprobado' ? '✓' :
                                        estadoSolicitud?.estado_instructor === 'Rechazado' ? '✗' : <i className="fa-regular fa-clock  fa-lg" style={{ color: 'black' }}></i>}
                                </div>
                                <p className="text-xs font-semibold mt-2 sm:text-sm">Instructor(a)</p>
                                <p className="text-xs text-gray-500">{localSolicitudData.nombre_instructor}</p>
                                <p className={`text-xs font-bold mt-1 ${estadoSolicitud?.estado_instructor === 'Aprobado' ? 'text-green-600' :
                                    estadoSolicitud?.estado_instructor === 'Rechazado' ? 'text-red-600' :
                                        'text-yellow-500'
                                    }`}>
                                    {estadoSolicitud?.estado_instructor === 'Aprobado' ? 'Aprobado' :
                                        estadoSolicitud?.estado_instructor === 'Rechazado' ? '❌ Rechazado' :
                                            ' Pendiente'}
                                </p>
                            </div>

                            {/* Línea conectora */}
                            <div className={`flex-1 h-1 ${estadoSolicitud?.estado_instructor === 'Aprobado' ? 'bg-green-500' : 'bg-gray-400'
                                }`}></div>

                            {/* Coordinación */}
                            <div className="flex flex-col items-center flex-1 min-h-[150px]">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${estadoSolicitud?.estado_instructor === 'Rechazado' ? 'bg-gray-400 text-white' :
                                    estadoSolicitud?.estado_coordinador === 'Aprobado' ? 'bg-[#39A900] text-white' :
                                        estadoSolicitud?.estado_coordinador === 'Rechazado' ? 'bg-red-500 text-white' :
                                            estadoSolicitud?.estado_general === 'Pendiente Coordinador' ? 'bg-yellow-500 text-white animate-pulse' :
                                                'bg-gray-300 text-gray-500'
                                    }`}>
                                    {estadoSolicitud?.estado_instructor === 'Rechazado' ? '🚫' :
                                        estadoSolicitud?.estado_coordinador === 'Aprobado' ? '✓' :
                                            estadoSolicitud?.estado_coordinador === 'Rechazado' ? '✗' : <i className="fa-regular fa-clock  fa-lg" style={{ color: 'black' }}></i>}
                                </div>
                                <p className="text-xs font-semibold mt-2  sm:text-sm">Coordinación</p>
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
                                        estadoSolicitud?.estado_coordinador === 'Aprobado' ? 'Aprobado' :
                                            estadoSolicitud?.estado_coordinador === 'Rechazado' ? '❌ Rechazado' :
                                                estadoSolicitud?.estado_general === 'Pendiente Coordinador' ? 'Pendiente' :
                                                    ' Pendiente'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Datos de la Solicitud */}
                    <div className="bg-white rounded-2xl p-4 shadow-lg">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
                            Datos de tu Solicitud
                        </h3>

                        {/* Main Grid: Usando clases custom para asegurar 500px exactos */}
                        <div className="custom-grid-container">

                            {/* Aprendiz Name */}
                            <div className="flex flex-col ">
                                <span className="titulo font-semibold text-gray-500 text-xs uppercase mb-1">Aprendiz:</span>
                                <span className="text-gray-800 text-xs p-1 bg-gray-50 rounded-tl rounded-tr border-l-4 border-l-blue-500 truncate" title={localSolicitudData.nombre_aprendiz}>
                                    {localSolicitudData.nombre_aprendiz}

                                </span>

                                <span className="text-gray-800 text-xs p-1 bg-gray-50 rounded-bl rounded-br border-l-4 border-l-blue-500 ">
                                    {localSolicitudData.documento_aprendiz}
                                </span>
                            </div>

                            {/* Instructor Name */}
                            <div className="flex flex-col">
                                <span className="titulo  font-semibold text-gray-500 text-xs uppercase mb-1">Instructor(a):</span>
                                <span className="text-gray-800 text-xs p-1 bg-gray-50 rounded-tl rounded-tr border-l-4 border-l-blue-500 truncate" title={localSolicitudData.nombre_instructor}>
                                    {localSolicitudData.nombre_instructor}
                                </span>
                                <span className="text-gray-800 text-xs p-1 bg-gray-50 rounded-bl rounded-br border-l-4 border-l-blue-500 ">
                                    {localSolicitudData.documento_instructor || 'No registrado'}
                                </span>

                            </div>



                            {/* Group: Ficha & Jornada (Side-by-side always on small, separate cells on large) */}
                            <div className="custom-wrapper-group">
                                <div className="flex flex-col">
                                    <span className="titulo font-semibold text-gray-500 text-xs uppercase mb-1">Ficha:</span>
                                    <span className="text-gray-800 text-xs p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                        {localSolicitudData.numero_ficha}
                                    </span>
                                </div>

                                <div className="flex flex-col">
                                    <span className="titulo font-semibold text-gray-500 text-xs uppercase mb-1">Jornada:</span>
                                    <span className="text-gray-800 text-xs p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                        {localSolicitudData.jornada || 'No registrada'}
                                    </span>
                                </div>
                            </div>

                            {/* Group: Salida & Regreso */}
                            {localSolicitudData.hora_regreso ? (
                                <div className="custom-wrapper-group">
                                    <div className="flex flex-col">
                                        <span className="titulo font-semibold text-gray-500 text-xs uppercase mb-1">Hora Salida:</span>
                                        <span className="text-gray-800 text-xs p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                            {formatTime12h(localSolicitudData.hora_salida)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="titulo font-semibold text-gray-500 text-xs uppercase mb-1">Hora Regreso:</span>
                                        <span className="text-gray-800 text-xs p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                            {formatTime12h(localSolicitudData.hora_regreso)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <span className="titulo font-semibold text-gray-500 text-xs uppercase mb-1">Hora Salida:</span>
                                    <span className="text-gray-800 text-xs p-2 bg-gray-50 rounded border-l-4 border-l-blue-500">
                                        {formatTime12h(localSolicitudData.hora_salida)}
                                    </span>
                                </div>
                            )}

                            {/* Motivo - Full Width */}
                            <div className="flex flex-col custom-full-width">
                                <span className="titulo font-semibold text-gray-500 text-xs uppercase mb-1">Motivo:</span>
                                <span className="text-gray-800 text-[14px] p-2 bg-gray-100 rounded border-l-4 border-l-yellow-500 italic">
                                    {localSolicitudData.motivo_mostrar}
                                </span>
                            </div>
                        </div>

                        {/* Botón para ver soporte si existe */}
                        {estadoSolicitud?.soporte && (
                            <button
                                onClick={() => setShowSoporteModal(true)}
                                className="bg-white w-full h-[45px] flex items-center justify-center gap-5 border border-blue-600 text-blue-600 text-[15px] font-bold cursor-pointer transition-all duration-300 rounded-[10px] hover:shadow-[0_10px_10px_rgba(0,0,0,0.048)] group mt-4"
                            >
                                <span className="w-[15px] h-auto flex items-end justify-center relative">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 71 67"
                                        className="w-full"
                                    >
                                        <path
                                            strokeWidth="5"
                                            stroke="blue"
                                            d="M41.7322 11.7678L42.4645 12.5H43.5H68.5V64.5H2.5V2.5H32.4645L41.7322 11.7678Z"
                                        ></path>
                                    </svg>

                                    <span
                                        className="
        absolute w-full h-[70%] border-2 border-blue-600 border-b-[1px]
        bg-white bottom-0 origin-bottom-right skew-x-[-40deg]
        transition-all duration-500
        group-hover:h-[50%] group-hover:skew-x-[-55deg]">

                                    </span>
                                </span>
                                <p className='text-sm'>
                                    Visualizar Soporte
                                </p>
                            </button>
                        )}

                        <button
                            onClick={handleVolverInicio}
                            className="text-sm mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all duration-300"
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
