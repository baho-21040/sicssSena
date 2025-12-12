import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';
import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

const InicioInstructor = () => {
    const { user } = useUser();

    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);

    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [showSoporteModal, setShowSoporteModal] = useState(false);
    const [showRechazarModal, setShowRechazarModal] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [notification, setNotification] = useState(null);

    // Mostrar notificación local (para feedback de acciones como aprobar/rechazar)
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // Cargar solicitudes (sin lógica de notificación - ahora es manejada por NotificationContext)
    const cargarSolicitudes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/solicitudes-pendientes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setSolicitudes(data.solicitudes);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Polling cada 5 segundos para actualizar la tabla
    useEffect(() => {
        cargarSolicitudes();
        const interval = setInterval(cargarSolicitudes, 5000);
        return () => clearInterval(interval);
    }, []);

    // Calcular tiempo transcurrido
    const getTimeAgo = (fecha) => {
        const now = new Date();
        const past = new Date(fecha);
        const diff = Math.floor((now - past) / 1000);

        if (diff < 60) return "hace un momento";
        if (diff < 120) return "hace 1 minuto";
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
        if (diff < 7200) return "hace 1 hora";
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
        if (diff < 172800) return "hace 1 día";
        return `hace ${Math.floor(diff / 86400)} días`;
    };

    // Traducción de motivos
    const getMotivoTexto = (motivo, descripcion) => {
        // Normalizar motivo (quitar espacios y convertir a minúsculas)
        const motivoNormalizado = (motivo || '').toString().trim().toLowerCase();

        const motivos = {
            'cita_medica': 'Cita o incapacidad médica',
            'cita medica': 'Cita o incapacidad médica',
            'electoral': 'Diligencias electorales/gubernamentales',
            'laboral': 'Requerimientos o compromisos laborales',
            'fuerza_mayor': 'Casos fortuitos o de fuerza mayor',
            'fuerza mayor': 'Casos fortuitos o de fuerza mayor',
            'etapa_productiva': 'Trámites de etapa productiva',
            'etapa productiva': 'Trámites de etapa productiva',
            'representacion_sena': 'Asistencia en representación del SENA',
            'representacion sena': 'Asistencia en representación del SENA',
            'diligencia_judicial': 'Citación a diligencias judiciales',
            'diligencia judicial': 'Citación a diligencias judiciales',
            'otros': 'Otros',
            'otro': 'Otros'
        };

        let texto = motivos[motivoNormalizado];

        // Si no se encuentra, intentar buscar por coincidencia parcial
        if (!texto) {
            for (const [key, value] of Object.entries(motivos)) {
                if (motivoNormalizado.includes(key) || key.includes(motivoNormalizado)) {
                    texto = value;
                    break;
                }
            }
        }

        // Si aún no se encuentra, usar el valor original o "Motivo Desconocido"
        if (!texto) {
            console.warn('Motivo no reconocido:', motivo, 'Descripción:', descripcion);
            texto = motivo || 'Motivo Desconocido';
        }

        // Agregar descripción si es "otros"
        if ((motivoNormalizado === 'otros' || motivoNormalizado === 'otro') && descripcion) {
            texto += `: ${descripcion}`;
        }

        return texto;
    };

    // Formatear hora
    const formatTime12h = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    // Formatear fecha
    const formatFecha = (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Formatear fecha con hora
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

    // Aprobar solicitud
    const aprobarSolicitud = async () => {
        if (!selectedSolicitud) return;
        setProcesando(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/aprobar`, {
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
                setShowDetallesModal(false);
                setSelectedSolicitud(null);
                showNotification('✅ ' + data.message, 'success');
            } else {
                showNotification('Error: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión', 'error');
        } finally {
            setProcesando(false);
        }
    };

    // Rechazar solicitud
    const rechazarSolicitud = async () => {
        if (!selectedSolicitud || !motivoRechazo.trim()) {
            showNotification('Por favor, especifique el motivo del rechazo', 'error');
            return;
        }

        setProcesando(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/rechazar`, {
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
                showNotification('❌ Solicitud rechazada', 'success');
            } else {
                showNotification('Error: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión', 'error');
        } finally {
            setProcesando(false);
        }
    };

    return (
        <DashboardLayout title="Portal de Instructor">
            <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">

                {/* Fila superior: 3 Tarjetas en una fila */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                    {/* TARJETA 1: Solicitudes Pendientes */}
                    <div className="bg-white rounded-2xl shadow-md p-6 relative overflow-hidden border-l-4 border-l-[#39A900] hover:-translate-y-1 transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100 to-green-50 rounded-bl-full opacity-50"></div>
                        <div className="flex items-center justify-between relative z-10 h-full">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-1">
                                    Solicitudes Pendientes
                                </h2>
                                <p className="text-gray-500 text-sm">Gestiona las solicitudes</p>
                            </div>
                            <div className="bg-gradient-to-br from-[#39A900] to-[#2A7D00] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg">
                                <span className="text-2xl font-bold">{solicitudes.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* TARJETA 2: Historial de salida */}
                    <Link to="/instructor/historial" className="block">
                        <div className="bg-white rounded-2xl shadow-md p-6 h-full flex items-center border-l-4 border-l-gray-300 hover:border-l-[#5856D6] hover:-translate-y-1 transition-all duration-300 group">
                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mr-4 group-hover:bg-[#5856D6] transition-colors">
                                <i className="fas fa-history text-gray-500 text-xl group-hover:text-white"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 group-hover:text-[#5856D6]">Historial de salida</h3>
                                <p className="text-gray-500 text-sm">Ver registros pasados</p>
                            </div>
                        </div>
                    </Link>

                    {/* TARJETA 3: Editar mi perfil */}
                    <Link to="/instructor/editarperfil" className="block">
                        <div className="bg-white rounded-2xl shadow-md p-6 h-full flex items-center border-l-4 border-l-gray-300 hover:border-l-purple-600 hover:-translate-y-1 transition-all duration-300 group">
                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mr-4 group-hover:bg-purple-600 transition-colors">
                                <i className="fas fa-user-edit text-gray-500 text-xl group-hover:text-white"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-600">Editar mi perfil</h3>
                                <p className="text-gray-500 text-sm">Actualizar datos</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Tabla de solicitudes - Ancho completo */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#39A900]"></div>
                    </div>
                ) : solicitudes.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <i className="fas fa-check-circle text-6xl text-[#39A900] mb-4"></i>
                        <p className="text-xl text-gray-600">No hay solicitudes pendientes</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                        <div className="bg-gradient-to-r from-[#5856E7] to-[#4A49B8] text-white px-6 py-4">
                            <h3 className="text-lg md:text-xl lg:text-2xl font-bold">Solicitudes enviadas</h3>
                        </div>

                        {/* Vista de tabla para pantallas grandes (>= 1024px) */}
                        <div className="hidden lg:block">
                            <table className="w-full">
                                <thead className="bg-[#5856D6] text-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold text-base lg:text-lg">Aprendiz</th>
                                        <th className="px-6 py-3 text-left font-semibold text-base lg:text-lg">Formación</th>
                                        <th className="px-6 py-3 text-left font-semibold text-base lg:text-lg">Tiempo</th>
                                        <th className="px-6 py-3 text-center font-semibold text-base lg:text-lg">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {solicitudes.map((solicitud, index) => (
                                        <tr
                                            key={solicitud.id_permiso}
                                            className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className=" text-gray-800 text-base lg:text-sm">
                                                        {solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}
                                                    </p>
                                                    <p className="text-sm lg:text-base text-gray-500">
                                                        Doc: {solicitud.documento_aprendiz}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-800 text-base lg:text-sm">
                                                        {solicitud.nombre_programa || 'Sin programa'}
                                                    </p>
                                                    <p className="text-sm lg:text-base text-gray-500">
                                                        Ficha: {solicitud.numero_ficha || 'N/A'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <i className="fas fa-clock text-sm lg:text-base"></i>
                                                    <span className="text-sm lg:text-xs">{getTimeAgo(solicitud.fecha_solicitud)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSolicitud(solicitud);
                                                        setShowDetallesModal(true);
                                                    }}
                                                    className="bg-[#5856D6] text-white px-2 py-2 rounded-lg hover:bg-[#4A49B8] transition-all duration-300 font-medium inline-flex items-center gap-2 text-base lg:text-sm"
                                                >
                                                    Ver más
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista de 2 columnas para tablets (700px - 1023px) */}
                        <div className="hidden sm:block lg:hidden p-4 space-y-4">
                            {solicitudes.map((solicitud, index) => (
                                <div
                                    key={solicitud.id_permiso}
                                    className="bg-white border-2 border-gray-300 rounded-xl shadow-md p-5 hover:border-[#5856D6] hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="space-y-4">
                                        {/* Fila 1: Documento (60%) | Nombre (40%) */}
                                        <div className="flex gap-4">
                                            <div className="w-[60%]">
                                                <p className="text-sm md:text-base font-semibold text-gray-600 mb-2">Documento</p>
                                                <p className="text-base md:text-lg text-gray-800 font-medium">{solicitud.documento_aprendiz}</p>
                                            </div>
                                            <div className="w-[40%]">
                                                <p className="text-sm md:text-base font-semibold text-gray-600 mb-2">Nombre</p>
                                                <p className="text-base md:text-sm text-gray-800 font-medium">
                                                    {solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Fila 2: Programa (60%) | Ficha (40%) */}
                                        <div className="flex gap-4 pt-3 border-t border-gray-200">
                                            <div className="w-[60%]">
                                                <p className="text-sm md:text-base font-semibold text-gray-600 mb-2">Programa</p>
                                                <p className="text-sm md:text-lg text-gray-800 font-medium">
                                                    {solicitud.nombre_programa || 'Sin programa'}
                                                </p>
                                            </div>
                                            <div className="w-[40%]">
                                                <p className="text-sm md:text-base font-semibold text-gray-600 mb-2">Ficha</p>
                                                <p className="text-base md:text-lg text-gray-800 font-medium">
                                                    {solicitud.numero_ficha || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Fila 3: Tiempo (ancho completo) */}
                                        <div className="pt-3 border-t border-gray-200">
                                            <p className="text-sm md:text-base font-semibold text-gray-600 mb-2">Tiempo</p>
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-clock text-sm md:text-base text-gray-600"></i>
                                                <span className="text-base md:text-lg text-gray-800 font-medium">{getTimeAgo(solicitud.fecha_solicitud)}</span>
                                            </div>
                                        </div>

                                        {/* Botón de acción */}
                                        <div className="pt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedSolicitud(solicitud);
                                                    setShowDetallesModal(true);
                                                }}
                                                className="w-full bg-[#5856D6] text-white px-4 py-3 rounded-lg hover:bg-[#4A49B8] transition-all duration-300 font-medium inline-flex items-center justify-center gap-2 text-base md:text-lg"
                                            >
                                                <i className="fas fa-eye"></i>
                                                Ver detalles
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Vista de 1 columna para móviles (< 700px) */}
                        <div className="sm:hidden p-4 space-y-4">
                            {solicitudes.map((solicitud, index) => (
                                <div
                                    key={solicitud.id_permiso}
                                    className="bg-white border-2 border-gray-300 rounded-xl shadow-md p-4 hover:border-[#5856D6] hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="space-y-3">
                                        {/* Documento */}
                                        <div className="border-b border-gray-200 pb-3">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Documento</p>
                                            <p className="text-base text-gray-800 font-medium">{solicitud.documento_aprendiz}</p>
                                        </div>

                                        {/* Nombre */}
                                        <div className="border-b border-gray-200 pb-3">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Nombre</p>
                                            <p className="text-base text-gray-800 font-medium">
                                                {solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}
                                            </p>
                                        </div>

                                        {/* Teléfono - if available */}
                                        {solicitud.telefono && (
                                            <div className="border-b border-gray-200 pb-3">
                                                <p className="text-sm font-semibold text-gray-600 mb-1">Teléfono</p>
                                                <p className="text-base text-gray-800 font-medium">{solicitud.telefono}</p>
                                            </div>
                                        )}

                                        {/* Correo - if available */}
                                        {solicitud.correo && (
                                            <div className="border-b border-gray-200 pb-3">
                                                <p className="text-sm font-semibold text-gray-600 mb-1">Correo</p>
                                                <p className="text-base text-gray-800 font-medium break-all">{solicitud.correo}</p>
                                            </div>
                                        )}

                                        {/* Programa */}
                                        <div className="border-b border-gray-200 pb-3">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Programa</p>
                                            <p className="text-base text-gray-800 font-medium">
                                                {solicitud.nombre_programa || 'Sin programa'}
                                            </p>
                                        </div>

                                        {/* Ficha */}
                                        <div className="border-b border-gray-200 pb-3">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Ficha</p>
                                            <p className="text-base text-gray-800 font-medium">
                                                {solicitud.numero_ficha || 'N/A'}
                                            </p>
                                        </div>

                                        {/* Tiempo */}
                                        <div className="border-b border-gray-200 pb-3">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Tiempo</p>
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-clock text-sm text-gray-600"></i>
                                                <span className="text-base text-gray-800 font-medium">{getTimeAgo(solicitud.fecha_solicitud)}</span>
                                            </div>
                                        </div>

                                        {/* Botón de acción */}
                                        <div className="pt-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedSolicitud(solicitud);
                                                    setShowDetallesModal(true);
                                                }}
                                                className="w-full bg-[#5856D6] text-white px-4 py-3 rounded-lg hover:bg-[#4A49B8] transition-all duration-300 font-medium inline-flex items-center justify-center gap-2 text-base"
                                            >
                                                <i className="fas fa-eye"></i>
                                                Ver detalles
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Detalles */}
            {showDetallesModal && selectedSolicitud && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pt-20 p-4" onClick={() => !procesando && setShowDetallesModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-[modalAppear_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] p-4 text-white">
                            <div className="flex items-start justify-between">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Detalles</h2>

                                <div className="flex flex-col items-end gap-2">
                                    {!procesando && (
                                        <button onClick={() => setShowDetallesModal(false)} className="text-white hover:text-gray-200 text-3xl leading-none">&times;</button>
                                    )}
                                    <p className="text-xs sm:text-sm md:text-base font-medium">{formatFechaHora(selectedSolicitud.fecha_solicitud)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Contenido */}
                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Fila 1: Documento | Aprendiz (2 columnas en >600px, 1 columna en <600px) */}
                            <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                    <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-1 sm:mb-2">Documento</p>
                                    <p className="font-bold text-gray-800 text-sm sm:text-base md:text-base">{selectedSolicitud.documento_aprendiz}</p>
                                </div>
                                <div className="bg-gray-50 p-3 sm:p-2 rounded-lg">
                                    <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-1 sm:mb-2">Aprendiz</p>
                                    <p className="font-bold text-gray-800 text-xs sm:text-base md:text-sm">{selectedSolicitud.nombre_aprendiz} {selectedSolicitud.apellido_aprendiz}</p>
                                </div>
                            </div>

                            {/* Fila 2: Programa (100% ancho) */}
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-1 sm:mb-2">Programa</p>
                                <p className="font-bold text-gray-800 text-sm sm:text-base md:text-sm">{selectedSolicitud.nombre_programa || 'Sin programa'}</p>
                            </div>

                            {/* Fila 3: Ficha | Jornada */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                    <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-1 sm:mb-2">Ficha</p>
                                    <p className="font-bold text-gray-800 text-sm sm:text-base md:text-base">{selectedSolicitud.numero_ficha || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                    <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-1 sm:mb-2">Jornada</p>
                                    <p className="font-bold text-gray-800 text-sm sm:text-base md:text-base">{selectedSolicitud.nombre_jornada || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Fila 4: Hora de Salida | Hora de Regreso (2 columnas en >380px, 1 columna en <380px) */}
                            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-400">
                                    <p className="text-xs sm:text-sm text-gray-600 uppercase font-semibold mb-1 sm:mb-2">Hora de Salida</p>
                                    <p className="font-bold text-gray-800 text-sm sm:text-base md:text-base">{formatTime12h(selectedSolicitud.hora_salida)}</p>
                                </div>
                                {selectedSolicitud.hora_regreso && (
                                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg border-l-4 border-green-400">
                                        <p className="text-xs sm:text-sm text-gray-600 uppercase font-semibold mb-1 sm:mb-2">Hora de Regreso</p>
                                        <p className="font-bold text-gray-800 text-sm sm:text-base md:text-base">{formatTime12h(selectedSolicitud.hora_regreso)}</p>
                                    </div>
                                )}
                            </div>

                            {/* Motivo */}
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 rounded-lg">
                                <p className="text-xs sm:text-sm text-gray-600 uppercase font-semibold mb-1 sm:mb-2">Motivo</p>
                                <p className="text-sm sm:text-base text-gray-800 italic">{getMotivoTexto(selectedSolicitud.motivo, selectedSolicitud.motivo_otros)}</p>
                            </div>

                            {/* Soporte */}
                            {selectedSolicitud.soporte && (
                                <div>
                                    <button
                                        onClick={() => setShowSoporteModal(true)}
                                        className="w-full bg-white text-blue-600 border-2 border-blue-600 py-2 sm:py-3 rounded-lg font-bold hover:bg-blue-50 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <span>📎</span> Visualizar Soporte Adjunto
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Botones de acción */}
                        <div className="p-4 bg-gray-50 flex gap-3">
                            <button
                                onClick={aprobarSolicitud}
                                disabled={procesando}
                                className="flex-1 bg-gradient-to-r from-[#39A900] to-[#2C5D00] text-white py-4 rounded-xl font-bold text-20 hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                            >
                                {procesando ? <><i className="fas fa-spinner fa-spin mr-2"></i>Procesando...</> : <><i className="fas fa-check mr-2"></i>Aprobar</>}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetallesModal(false);
                                    setShowRechazarModal(true);
                                }}
                                disabled={procesando}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-20 hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                            >
                                <i className="fas fa-times mr-2"></i>Rechazar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Rechazo */}
            {showRechazarModal && selectedSolicitud && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001] backdrop-blur-sm p-4" onClick={() => !procesando && setShowRechazarModal(false)}>
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
                            <p className="text-gray-700 mb-4">Especifique la razón del rechazo:</p>
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

            {/* Toast Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[9999] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-[slideIn_0.3s_ease-out] ${notification.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                    }`}>
                    <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-2xl`}></i>
                    <span className="font-semibold text-lg">{notification.message}</span>
                </div>
            )}

            <style>{`
                @keyframes modalAppear {
                    from { opacity: 0; transform: scale(0.9) translateY(-20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(100px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </DashboardLayout>
    );
};

export default InicioInstructor;
