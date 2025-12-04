import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../../components/DashboardLayout';
import Footer from '../../components/Footer';
import { useUser } from '../../contexts/UserContext';

import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

export default function InicioAprendiz() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showSoporteModal, setShowSoporteModal] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [solicitudToCancel, setSolicitudToCancel] = useState(null);

    useEffect(() => {
        fetchSolicitudesHoy();
        // Polling cada 5 segundos para actualizaciones en tiempo real
        const interval = setInterval(fetchSolicitudesHoy, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchSolicitudesHoy = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/aprendiz/solicitudes-hoy`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Intentar parsear JSON directamente sin verificar content-type
            const text = await response.text();

            // Remover BOM si existe
            const cleanText = text.replace(/^\uFEFF/, '');

            try {
                const data = JSON.parse(cleanText);

                if (data.status === 'ok') {
                    setSolicitudes(data.solicitudes);
                } else {
                    setError(data.message || 'Error al cargar solicitudes');
                }
            } catch (jsonError) {
                console.error('Error parsing JSON:', jsonError);
                console.error('Response text:', text);
                setError('Error al procesar la respuesta del servidor');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Error de conexión. Verifica que el backend esté corriendo.');
        } finally {
            setLoading(false);
        }
    };

    const openDetallesModal = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setShowDetallesModal(true);
    };

    const closeDetallesModal = () => {
        setShowDetallesModal(false);
        setSelectedSolicitud(null);
    };

    const openQRModal = () => {
        setShowQRModal(true);
    };

    const closeQRModal = () => {
        setShowQRModal(false);
    };

    const openSoporteModal = () => {
        setShowSoporteModal(true);
    };

    const closeSoporteModal = () => {
        setShowSoporteModal(false);
    };

    const openCancelModal = (id_permiso) => {
        setSolicitudToCancel(id_permiso);
        setShowCancelModal(true);
    };

    const closeCancelModal = () => {
        setShowCancelModal(false);
        setSolicitudToCancel(null);
    };

    const handleCancelarSolicitud = async () => {
        if (!solicitudToCancel) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/aprendiz/solicitud/${solicitudToCancel}/cancelar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'ok') {
                closeCancelModal();
                closeDetallesModal();
                setShowSuccessMessage(true);
                fetchSolicitudesHoy(); // Recargar lista

                // Ocultar mensaje de éxito después de 3 segundos
                setTimeout(() => {
                    setShowSuccessMessage(false);
                }, 3000);
            } else {
                alert(data.message || 'Error al cancelar la solicitud');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error de conexión al cancelar la solicitud');
        }
    };

    const getEstadoBadgeClass = (estado) => {
        const estadoNormalizado = estado.toLowerCase().replace(/\s/g, '');

        if (estadoNormalizado.includes('aprobado') || estadoNormalizado.includes('qrgenerado')) {
            return 'bg-[#e8f5e1] text-[#2A7D00]';
        } else if (estadoNormalizado.includes('rechazad') || estadoNormalizado.includes('cancelad')) {
            return 'bg-[#ffe0e0] text-[#b32a26]';
        } else if (estadoNormalizado.includes('pendiente')) {
            return 'bg-[#fffbe6] text-[#a07a00]';
        }
        return 'bg-gray-100 text-gray-700';
    };

    const getEstadoDisplay = (estado) => {
        if (estado === 'Aprobado QR Generado' || estado.toLowerCase().includes('qrgenerado')) {
            return (
                <span className="flex items-center gap-1">
                    <i className="fas fa-qrcode"></i>
                    Aprobado
                </span>
            );
        }
        if (estado === 'Pendiente Instructor') {
            return (
                <span className="flex items-center gap-1">
                    <i className="fa-regular fa-clock fa-spin"></i>
                    Instructor
                </span>
            );
        }
        if (estado === 'Pendiente Coordinador' || estado === 'Pendiente Coordinación') {
            return (
                <span className="flex items-center gap-1">
                    <i className="fa-regular fa-clock fa-spin"></i>
                    Coordinación
                </span>
            );
        }
        return estado;
    };

    const formatFechaActual = () => {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const año = hoy.getFullYear();
        return `${dia}/${mes}/${año}`;
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

    const formatSoloHora = (fechaStr) => {
        if (!fechaStr) return '-';
        const fecha = new Date(fechaStr);
        const horas = fecha.getHours();
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        const ampm = horas >= 12 ? 'p.m.' : 'a.m.';
        const horas12 = horas % 12 || 12;
        return `${horas12}:${minutos} ${ampm}`;
    };

    const formatTime12h = (timeStr) => {
        if (!timeStr) return '-';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const getMotivoCompleto = (motivo, descripcion) => {
        const motivoNormalizado = (motivo || '').toString().trim().toLowerCase();
        const motivos = {
            'cita_medica': 'Cita o incapacidad médica',
            'electoral': 'Citaciones a diligencias electorales y/o gubernamentales',
            'laboral': 'Requerimientos o compromisos laborales',
            'fuerza_mayor': 'Casos fortuitos o de fuerza mayor',
            'etapa_productiva': 'Trámites de etapa productiva',
            'representacion_sena': 'Autorización para asistir en representación del SENA',
            'diligencia_judicial': 'Citación a diligencias judiciales',
            'otros': 'Otros'
        };

        let texto = motivos[motivoNormalizado] || motivo || 'Motivo Desconocido';
        if ((motivoNormalizado === 'otros' || motivoNormalizado === 'otro') && descripcion) {
            texto += `: ${descripcion}`;
        }
        return texto;
    };

    const timeAgo = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Hace un momento';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
        return formatFechaHora(dateString);
    };

    return (
        <DashboardLayout title="Portal del Aprendiz | Dashboard">
            <div className="min-h-screen flex flex-col bg-[#f4f4f4]">
                <main className="flex-1 p-6 md:p-8">
                    {/* Grid de Tarjetas de Acción */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-8">

                        {/* Tarjeta 1: Crear Nueva Solicitud */}
                        <Link
                            data-aos="zoom-in"
                            data-aos-duration="400"
                            to="/Aprendiz/Solicitud"
                            className="rounded-[60px]  bg-gradient-to-br from-[#e8f5e1] to-white  shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-6 border-t-4 border-t-[#39A900] hover:!-translate-y-1 hover:!shadow-[0_10px_25px_rgba(0,0,0,0.15)] !transition-all !duration-300 no-underline"
                        >
                            <div className="flex items-start gap-4">
                                <div className="bg-[#39A900] text-white p-4 rounded-full">
                                    <i className="fas fa-file-alt text-2xl"></i>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-[#2A7D00] mb-2">Permiso de Salida</h2>
                                    <p className="text-gray-600 text-sm">¿Necesitas salir?</p>
                                    <div className="mt-4 inline-flex items-center gap-2 text-[#39A900] font-semibold">
                                        Nueva Solicitud
                                        <i className="fas fa-arrow-right"></i>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Tarjeta 2: Editar Perfil */}
                        <Link
                            to="/aprendiz/editarperfil"
                            className="bg-white rounded-[60px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-6 border-t-4 border-t-[#17a2b8] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] transition-all duration-300 no-underline"
                        >
                            <div className="flex items-start gap-4">
                                <div className="bg-[#17a2b8] text-white p-4 rounded-full">
                                    <i className="fas fa-user-edit text-2xl"></i>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-[#2A7D00] mb-2">Mi Perfil</h2>
                                    <p className="text-gray-600 text-sm">Actualiza tu información personal.</p>
                                    <div className="mt-4 inline-flex items-center gap-2 text-[#17a2b8] font-semibold">
                                        Editar Perfil
                                        <i className="fas fa-arrow-right"></i>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Tarjeta 3: Historial Completo */}
                        <Link
                            to="/aprendiz/historial"
                            className="bg-white rounded-[60px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-6 border-t-4 border-t-[#ffc107] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] transition-all duration-300 no-underline"
                        >
                            <div className="flex items-start gap-4">
                                <div className="bg-[#ffc107] text-white p-4 rounded-full">
                                    <i className="fas fa-history text-2xl"></i>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-[#2A7D00] mb-2">Historial</h2>
                                    <p className="text-gray-600 text-sm">Consulta todas tus solicitudes.</p>
                                    <div className="mt-4 inline-flex items-center gap-2 text-[#ffc107] font-semibold">
                                        Ver Historial
                                        <i className="fas fa-arrow-right"></i>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Tabla de Solicitudes del Día */}
                    <div data-aos="fade-up"
                        data-aos-duration="500" className="bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-4 border-t-[#39A900]">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl max-[600px]:text-lg font-bold text-[#2A7D00] flex items-center gap-3">
                                <i className="fas fa-calendar-day text-[#39A900]"></i>
                                Mis Solicitudes de Hoy ({formatFechaActual()})
                            </h2>
                        </div>

                        {/* Vista de tabla para pantallas grandes */}
                        <div className="overflow-x-auto max-[600px]:hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Motivo</th>
                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Enviado</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Estado</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center">
                                                <i className="fas fa-spinner fa-spin text-3xl text-[#39A900]"></i>
                                                <p className="mt-2 text-gray-600">Cargando solicitudes...</p>
                                            </td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-red-600">
                                                <i className="fas fa-exclamation-circle text-2xl"></i>
                                                <p className="mt-2">{error}</p>
                                            </td>
                                        </tr>
                                    ) : solicitudes.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                <i className="fas fa-inbox text-4xl mb-3 block"></i>
                                                No hay solicitudes registradas para el día de hoy.
                                            </td>
                                        </tr>
                                    ) : (
                                        solicitudes.map((solicitud) => (
                                            <tr key={solicitud.id_permiso} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 text-sm text-gray-700 font-medium">{getMotivoCompleto(solicitud.motivo, solicitud.descripcion)}</td>
                                                <td className="px-6 py-4 text-xs text-gray-500">
                                                    <div className="flex items-center gap-2">
                                                        <i className="far fa-clock"></i>
                                                        {timeAgo(solicitud.fecha_solicitud)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${getEstadoBadgeClass(solicitud.estado_display)}`}>
                                                        {getEstadoDisplay(solicitud.estado_display)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => openDetallesModal(solicitud)}
                                                        className="bg-[#17a2b8] text-white px-4 py-2 rounded-md hover:bg-[#138496] transition inline-flex items-center gap-2 text-xs font-semibold"
                                                    >
                                                        Detalles
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista de tarjetas para móvil (< 600px) */}
                        <div className="hidden max-[601px]:block p-4">
                            {loading ? (
                                <div className="py-8 text-center">
                                    <i className="fas fa-spinner fa-spin text-3xl text-[#39A900]"></i>
                                    <p className="mt-2 text-gray-600">Cargando solicitudes...</p>
                                </div>
                            ) : error ? (
                                <div className="py-8 text-center text-red-600">
                                    <i className="fas fa-exclamation-circle text-2xl"></i>
                                    <p className="mt-2">{error}</p>
                                </div>
                            ) : solicitudes.length === 0 ? (
                                <div className="py-8 text-center text-gray-500">
                                    <i className="fas fa-inbox text-4xl mb-3 block"></i>
                                    No hay solicitudes registradas para el día de hoy.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {solicitudes.map((solicitud) => (
                                        <div
                                            key={solicitud.id_permiso}
                                            className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 border border-gray-100 relative overflow-hidden"
                                        >
                                            {/* Barra de color superior según estado */}
                                            <div className={`absolute top-0 left-0 right-0 h-1 ${solicitud.estado_display.toLowerCase().includes('aprobado') || solicitud.estado_display.toLowerCase().includes('qrgenerado')
                                                ? 'bg-gradient-to-r from-[#2A7D00] to-[#39A900]'
                                                : solicitud.estado_display.toLowerCase().includes('rechazad') || solicitud.estado_display.toLowerCase().includes('cancelad')
                                                    ? 'bg-gradient-to-r from-[#b32a26] to-[#d63031]'
                                                    : 'bg-gradient-to-r from-[#ffc107] to-[#ff9800]'
                                                }`}></div>

                                            {/* Motivo - Ocupa todo el ancho */}
                                            <div className="mb-4 pt-2">
                                                <div className="flex items-start gap-2">
                                                    <div className="bg-[#e8f5e1] p-2 rounded-lg">
                                                        <i className="fas fa-file-alt text-[#39A900] text-sm"></i>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1 tracking-wide">Motivo</p>
                                                        <p className="text-sm text-gray-800 font-medium leading-snug">{getMotivoCompleto(solicitud.motivo, solicitud.descripcion)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Enviado y Estado en la misma fila */}
                                            <div className="grid grid-cols-2 max-[350px]:grid-cols-1 gap-3 mb-4">
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1.5 tracking-wide">Enviado</p>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                                                        <i className="far fa-clock text-[#39A900]"></i>
                                                        {timeAgo(solicitud.fecha_solicitud)}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1.5 tracking-wide">Estado</p>
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center ${getEstadoBadgeClass(solicitud.estado_display)}`}>
                                                        {getEstadoDisplay(solicitud.estado_display)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Botón Detalles - Inferior derecha */}
                                            <div className="flex justify-end pt-2 border-t border-gray-100">
                                                <button
                                                    onClick={() => openDetallesModal(solicitud)}
                                                    className="bg-gradient-to-r from-[#17a2b8] to-[#138496] text-white px-4 py-2 rounded-xl hover:from-[#138496] hover:to-[#117a8b] transition-all duration-300 inline-flex items-center gap-2 text-xs font-semibold shadow-sm hover:shadow-md"
                                                >
                                                    <i className="fas fa-info-circle"></i>
                                                    Detalles
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Ver Historial Completo */}
                        <div className="p-4 bg-gray-50 text-right">
                            <Link
                                to="/aprendiz/historial"
                                className="text-[#2A7D00] font-semibold hover:text-[#39A900] transition inline-flex items-center gap-2 no-underline"
                            >
                                Ver Historial Completo
                                <i className="fas fa-arrow-right"></i>
                            </Link>
                        </div>
                    </div>
                </main>

                {/* Modal de Detalles */}
                {showDetallesModal && selectedSolicitud && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[1001] p-4"
                        onClick={closeDetallesModal}
                    >
                        <div
                            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 relative border-t-4 border-t-[#39A900] max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={closeDetallesModal}
                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-3xl font-bold leading-none"
                            >
                                &times;
                            </button>

                            <h3 className="text-xl font-bold text-[#2A7D00] mb-4 pb-3 border-b border-gray-200">
                                Detalles de la Solicitud
                            </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Hora</p>
                                        <p className="font-semibold text-gray-800">{formatSoloHora(selectedSolicitud.fecha_solicitud)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Estado</p>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${getEstadoBadgeClass(selectedSolicitud.estado_display)}`}>
                                            {getEstadoDisplay(selectedSolicitud.estado_display)}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Motivo</p>
                                    <p className="text-sm text-gray-800">{getMotivoCompleto(selectedSolicitud.motivo, selectedSolicitud.descripcion)}</p>
                                </div>

                                {/* Información de Rechazo */}
                                {selectedSolicitud.estado_general.includes('Rechazado') && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                                        <p className="text-xs text-red-600 uppercase font-bold mb-1">
                                            Rechazado por: {
                                                selectedSolicitud.rol_rechazo ||
                                                (selectedSolicitud.estado_instructor === 'Rechazado' ? 'Instructor' :
                                                    (selectedSolicitud.estado_coordinador === 'Rechazado' ? 'Coordinación' : 'Sistema'))
                                            }
                                        </p>
                                        <p className="text-sm text-red-800 italic">
                                            "{selectedSolicitud.observacion_rechazo || selectedSolicitud.motivo_rechazo_instructor || selectedSolicitud.motivo_rechazo_coordinador || 'Sin justificación'}"
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 max-[760px]:grid-cols-1 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-lg max-[760px]:col-span-1">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Instructor</p>
                                        <p className="font-semibold text-gray-800">
                                            {selectedSolicitud.nombre_instructor} {selectedSolicitud.apellido_instructor}
                                        </p>
                                        <p className="text-xs text-gray-500">{selectedSolicitud.documento_instructor}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center max-[760px]:col-span-1">
                                        {/* Botón Ver Soporte */}
                                        {selectedSolicitud.soporte ? (
                                            <button
                                                onClick={openSoporteModal}
                                                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center justify-center gap-2 text-sm font-semibold w-full"
                                            >
                                                <i className="fas fa-paperclip"></i>
                                                Ver Soporte
                                            </button>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic text-center">Sin soporte adjunto</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Hora de Salida</p>
                                        <p className="font-semibold text-gray-800">{formatTime12h(selectedSolicitud.hora_salida)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Hora de Regreso</p>
                                        <p className="font-semibold text-gray-800">{selectedSolicitud.hora_regreso ? formatTime12h(selectedSolicitud.hora_regreso) : 'No aplica'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                {/* Botón Cancelar Solicitud (Solo si está pendiente) */}
                                {selectedSolicitud.estado_display.toLowerCase().includes('pendiente') ? (
                                    <button
                                        onClick={() => openCancelModal(selectedSolicitud.id_permiso)}
                                        className="bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition inline-flex items-center justify-center gap-2 text-sm font-semibold"
                                    >
                                        <i className="fas fa-times-circle"></i>
                                        Cancelar Solicitud
                                    </button>
                                ) : (
                                    <div className="hidden"></div> // Espaciador si no se muestra el botón
                                )}

                                {selectedSolicitud.qr ? (
                                    <button
                                        onClick={openQRModal}
                                        className="bg-[#17a2b8] text-white px-4 py-3 rounded-lg hover:bg-[#138496] transition inline-flex items-center justify-center gap-2 text-sm font-semibold col-start-2"
                                    >
                                        <i className="bi bi-qr-code"></i>
                                        Ver QR
                                    </button>
                                ) : selectedSolicitud.estado_display.toLowerCase().includes('pendiente') ? (
                                    <button
                                        onClick={() => navigate('/aprendiz/espera', {
                                            state: {
                                                solicitudData: {
                                                    nombre_instructor: selectedSolicitud.nombre_instructor,
                                                    nombre_aprendiz: user.nombre + ' ' + user.apellido, // Asumiendo que user tiene estos datos
                                                    documento_aprendiz: user.documento,
                                                    nombre_programa: user.programa?.nombre_programa || 'N/A',
                                                    numero_ficha: user.programa?.numero_ficha || 'N/A',
                                                    fecha_salida: formatFechaActual(), // O la fecha de la solicitud
                                                    hora_salida: selectedSolicitud.hora_salida,
                                                    motivo_mostrar: getMotivoCompleto(selectedSolicitud.motivo, selectedSolicitud.descripcion)
                                                },
                                                id_permiso: selectedSolicitud.id_permiso
                                            }
                                        })}
                                        className="bg-gray-300 text-gray-600 px-4 py-3 rounded-lg hover:bg-gray-400 transition inline-flex items-center justify-center gap-2 text-sm font-semibold col-start-2"
                                    >
                                        <i className="fas fa-clock"></i>
                                        (Ver Estado)
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="bg-gray-100 text-gray-400 px-4 py-3 rounded-lg cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm font-semibold col-start-2"
                                    >
                                        <i className="fas fa-ban"></i>
                                        {selectedSolicitud.estado_display}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal QR */}
                {showQRModal && selectedSolicitud && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[1002] p-4"
                        onClick={closeQRModal}
                    >
                        <div
                            className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 relative border-t-4 border-t-[#39A900]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={closeQRModal}
                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-3xl font-bold leading-none"
                            >
                                &times;
                            </button>

                            <h3 className="text-2xl font-bold text-[#2A7D00] mb-2 pb-3 border-b border-gray-200">
                                Código QR del Permiso
                            </h3>

                            <p className="text-gray-600 mb-6 text-center">
                                Muestra este código al personal de seguridad en la entrada/salida.
                            </p>

                            <div className="flex justify-center items-center p-6 bg-white rounded-lg">
                                <div className="border-4 border-white shadow-lg rounded-lg">
                                    <QRCodeSVG
                                        value={selectedSolicitud.qr}
                                        size={200}
                                        level="H"
                                        fgColor="#2A7D00"
                                        bgColor="#ffffff"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={closeQRModal}
                                className="w-full mt-6 bg-[#39A900] text-white py-3 rounded-lg font-semibold hover:bg-[#2A7D00] transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal Soporte */}
                {showSoporteModal && selectedSolicitud?.soporte && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-[1002] p-4"
                        onClick={closeSoporteModal}
                    >
                        <div className="relative max-w-4xl w-full max-h-[90vh] flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={closeSoporteModal}
                                className="absolute -top-12 right-0 text-white text-3xl hover:text-gray-300"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                            <img src={`${API}/${selectedSolicitud.soporte}`} alt="Soporte" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                        </div>
                    </div>
                )}

                {/* Modal de Confirmación de Cancelación */}
                {showCancelModal && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[1003] p-4"
                        onClick={closeCancelModal}
                    >
                        <div
                            className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 relative border-t-4 border-t-red-500 animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                    <i className="fas fa-exclamation-triangle text-red-600 text-3xl"></i>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    ¿Estás seguro?
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    ¿Estás seguro de que deseas cancelar esta solicitud? Esta acción no se puede deshacer.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={closeCancelModal}
                                    className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                                >
                                    No, volver
                                </button>
                                <button
                                    onClick={handleCancelarSolicitud}
                                    className="bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition font-semibold inline-flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-check"></i>
                                    Sí, cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mensaje de Éxito */}
                {showSuccessMessage && (
                    <div className="fixed top-4 right-4 z-[1004] animate-fade-in">
                        <div className="bg-white rounded-lg shadow-2xl border-l-4 border-green-500 p-4 flex items-center gap-3 max-w-md">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <i className="fas fa-check-circle text-green-600 text-xl"></i>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-900">¡Solicitud cancelada!</h4>
                                <p className="text-xs text-gray-600 mt-1">La solicitud ha sido cancelada correctamente.</p>
                            </div>
                            <button
                                onClick={() => setShowSuccessMessage(false)}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}