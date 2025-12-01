import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';
import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

export default function HistorialInstructor() {
    const { user } = useUser();
    const [solicitudes, setSolicitudes] = useState([]);
    const [filteredSolicitudes, setFilteredSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('todas'); // todas, pendiente, aprobado, rechazado

    // Modales
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showSoporteModal, setShowSoporteModal] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [showConfirmDeleteOneModal, setShowConfirmDeleteOneModal] = useState(false);
    const [solicitudToDelete, setSolicitudToDelete] = useState(null);

    useEffect(() => {
        fetchHistorial();
        // Polling cada 5 segundos para actualizaciones en tiempo real
        const interval = setInterval(fetchHistorial, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        filterSolicitudes();
    }, [solicitudes, filter]);

    const fetchHistorial = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/historial`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'ok') {
                setSolicitudes(data.solicitudes);
            } else {
                setError(data.message || 'Error al cargar el historial');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Error de conexión al cargar el historial');
        } finally {
            setLoading(false);
        }
    };

    const filterSolicitudes = () => {
        if (filter === 'todas') {
            setFilteredSolicitudes(solicitudes);
        } else {
            const filtered = solicitudes.filter(solicitud => {
                const estado = solicitud.estado_general.toLowerCase();
                if (filter === 'pendiente') return estado.includes('pendiente');
                if (filter === 'aprobado') return estado.includes('aprobado');
                if (filter === 'rechazado') return estado.includes('rechazado');
                return true;
            });
            setFilteredSolicitudes(filtered);
        }
    };

    const handleDeleteAll = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/historial`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'ok') {
                fetchHistorial(); // Recargar para reflejar cambios
                setShowConfirmDeleteModal(false);
            } else {
                alert(data.message || 'Error al eliminar el historial');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error de conexión al eliminar el historial');
        }
    };

    const confirmDeleteOne = (solicitud) => {
        setSolicitudToDelete(solicitud);
        setShowConfirmDeleteOneModal(true);
    };

    const handleDeleteOne = async () => {
        if (!solicitudToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/instructor/solicitud/${solicitudToDelete.id_permiso}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'ok') {
                setSolicitudes(prev => prev.filter(s => s.id_permiso !== solicitudToDelete.id_permiso));
                setShowConfirmDeleteOneModal(false);
                setSolicitudToDelete(null);
                // Si la solicitud eliminada estaba abierta en el modal de detalles, cerrarlo
                if (selectedSolicitud && selectedSolicitud.id_permiso === solicitudToDelete.id_permiso) {
                    closeDetallesModal();
                }
            } else {
                alert(data.message || 'Error al eliminar la solicitud');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error de conexión al eliminar la solicitud');
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

    const formatFechaHora = (fechaStr) => {
        if (!fechaStr) return '-';
        const fecha = new Date(fechaStr);
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const año = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${año} - ${horas}:${minutos}`;
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

    return (
        <DashboardLayout title="Historial de Solicitudes">
            <div className="min-h-screen bg-[#f4f4f4] p-6 md:p-8">
                <div className="max-w-7xl mx-auto">

                    {/* Header y Filtros */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-[#2A7D00]">Historial de Solicitudes</h1>
                            <p className="text-gray-600 mt-1">Consulta todas las solicitudes que has gestionado.</p>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:border-transparent shadow-sm"
                            >
                                <option value="todas">Todas las solicitudes</option>
                                <option value="pendiente">En espera</option>
                                <option value="aprobado">Aprobadas</option>
                                <option value="rechazado">Rechazadas</option>
                            </select>

                            <button
                                onClick={() => setShowConfirmDeleteModal(true)}
                                className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2"
                            >
                                <i className="fas fa-trash-alt"></i>
                                Vaciar solicitudes
                            </button>
                        </div>
                    </div>

                    {/* Lista de Solicitudes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center">
                                <i className="fas fa-spinner fa-spin text-4xl text-[#39A900] mb-4"></i>
                                <p className="text-gray-500">Cargando historial...</p>
                            </div>
                        ) : error ? (
                            <div className="p-12 text-center text-red-500">
                                <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
                                <p>{error}</p>
                            </div>
                        ) : filteredSolicitudes.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                                    <i className="fas fa-history text-3xl text-gray-400"></i>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-1">No hay solicitudes</h3>
                                <p className="text-sm">No se encontraron solicitudes con el filtro seleccionado.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                            <th className="px-6 py-4">Fecha y Hora</th>
                                            <th className="px-6 py-4">Aprendiz</th>
                                            <th className="px-6 py-4">Motivo</th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredSolicitudes.map((solicitud) => (
                                            <tr key={solicitud.id_permiso} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                                    {formatFechaHora(solicitud.fecha_solicitud)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    <div>
                                                        <p className="font-medium">{solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}</p>
                                                        <p className="text-xs text-gray-500">Doc: {solicitud.documento_aprendiz}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {getMotivoCompleto(solicitud.motivo, solicitud.descripcion)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadgeClass(solicitud.estado_display)}`}>
                                                        {solicitud.estado_display}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => openDetallesModal(solicitud)}
                                                        className="text-[#39A900] hover:text-[#2A7D00] bg-[#e8f5e1] hover:bg-[#d4edda] p-2 rounded-lg transition-colors"
                                                        title="Ver detalles"
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal de Detalles */}
                {showDetallesModal && selectedSolicitud && (
                    <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeDetallesModal}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border-t-4 border-[#39A900]">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 className="text-xl leading-6 font-bold text-[#2A7D00]" id="modal-title">
                                            Detalles de la Solicitud
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {/* Solo mostrar botón de eliminar si NO está pendiente */}
                                            {!selectedSolicitud.estado_general.toLowerCase().includes('pendiente') && (
                                                <button
                                                    onClick={() => confirmDeleteOne(selectedSolicitud)}
                                                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition"
                                                    title="Eliminar solicitud"
                                                >
                                                    <i className="fas fa-trash-alt text-lg"></i>
                                                </button>
                                            )}
                                            <button onClick={closeDetallesModal} className="text-gray-400 hover:text-gray-500 focus:outline-none">
                                                <span className="sr-only">Cerrar</span>
                                                <i className="fas fa-times text-xl"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Estado y Fecha */}
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold">Fecha Solicitud</p>
                                                <p className="text-sm font-medium text-gray-900">{formatFechaHora(selectedSolicitud.fecha_solicitud)}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getEstadoBadgeClass(selectedSolicitud.estado_display)}`}>
                                                {selectedSolicitud.estado_display}
                                            </span>
                                        </div>

                                        {/* Aprendiz */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Aprendiz</p>
                                                <p className="text-sm font-medium text-gray-900">{selectedSolicitud.nombre_aprendiz} {selectedSolicitud.apellido_aprendiz}</p>
                                                <p className="text-xs text-gray-500">{selectedSolicitud.documento_aprendiz}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Programa</p>
                                                <p className="text-sm font-medium text-gray-900">{selectedSolicitud.nombre_programa}</p>
                                                <p className="text-xs text-gray-500">Ficha: {selectedSolicitud.numero_ficha}</p>
                                            </div>
                                        </div>

                                        {/* Motivo */}
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Motivo</p>
                                            <div className="bg-white border border-gray-200 p-3 rounded-lg text-sm text-gray-700">
                                                {getMotivoCompleto(selectedSolicitud.motivo, selectedSolicitud.descripcion)}
                                            </div>
                                        </div>

                                        {/* Horario */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hora Salida</p>
                                                <p className="text-sm font-medium text-gray-900">{selectedSolicitud.hora_salida}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hora Regreso</p>
                                                <p className="text-sm font-medium text-gray-900">{selectedSolicitud.hora_regreso || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Información de Rechazo */}
                                        {selectedSolicitud.estado_general === 'Rechazado' && (
                                            <div className="bg-red-50 border border-red-100 p-3 rounded-lg mt-2">
                                                <p className="text-xs text-red-600 uppercase font-bold mb-1">
                                                    Motivo de Rechazo
                                                </p>
                                                <p className="text-sm text-red-800 italic">
                                                    "{selectedSolicitud.motivo_rechazo_instructor || selectedSolicitud.motivo_rechazo_coordinador || 'Sin justificación'}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Botones de Acción (Soporte y QR) */}
                                        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                                            {selectedSolicitud.soporte && (
                                                <button
                                                    onClick={() => setShowSoporteModal(true)}
                                                    className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-4 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                                                >
                                                    <i className="fas fa-paperclip"></i> Ver Soporte
                                                </button>
                                            )}

                                            {selectedSolicitud.qr ? (
                                                <button
                                                    onClick={() => setShowQRModal(true)}
                                                    className="flex-1 bg-[#39A900] text-white hover:bg-[#2A7D00] py-2 px-4 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                                                >
                                                    <i className="fas fa-qrcode"></i> Ver QR
                                                </button>
                                            ) : selectedSolicitud.estado_general.includes('Aprobado') ? (
                                                <button disabled className="flex-1 bg-gray-100 text-gray-400 py-2 px-4 rounded-lg text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2">
                                                    <i className="fas fa-check-circle"></i> QR ya escaneado
                                                </button>
                                            ) : (
                                                <button disabled className="flex-1 bg-gray-100 text-gray-400 py-2 px-4 rounded-lg text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2">
                                                    <i className="fas fa-clock"></i> Pendiente
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Confirmación Eliminar Todo */}
                {showConfirmDeleteModal && (
                    <div className="fixed inset-0 z-[1001] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowConfirmDeleteModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <i className="fas fa-exclamation-triangle text-red-600"></i>
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                ¿Vaciar historial de solicitudes?
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    ¿Estás seguro de que quieres eliminar todas las solicitudes procesadas? Las solicitudes pendientes no se eliminarán. Esta acción no se puede deshacer.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={handleDeleteAll}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Sí, eliminar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmDeleteModal(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Confirmación Eliminar UNA */}
                {showConfirmDeleteOneModal && (
                    <div className="fixed inset-0 z-[1002] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowConfirmDeleteOneModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <i className="fas fa-trash-alt text-red-600"></i>
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                ¿Eliminar esta solicitud?
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    ¿Estás seguro de que quieres eliminar esta solicitud? Esta acción no se puede deshacer.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={handleDeleteOne}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Sí, eliminar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmDeleteOneModal(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal QR */}
                {showQRModal && selectedSolicitud && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-[1002] p-4" onClick={() => setShowQRModal(false)}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                            <h3 className="text-xl font-bold text-center text-[#2A7D00] mb-6">Código QR de Salida</h3>
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-white rounded-lg shadow-inner border border-gray-200">
                                    <QRCodeSVG value={selectedSolicitud.qr} size={200} level="H" />
                                </div>
                            </div>
                            <p className="text-center text-sm text-gray-500 mb-6">Código QR del aprendiz.</p>
                            <button onClick={() => setShowQRModal(false)} className="w-full bg-[#39A900] text-white py-3 rounded-lg font-semibold hover:bg-[#2A7D00] transition">
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal Soporte */}
                {showSoporteModal && selectedSolicitud?.soporte && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-[1002] p-4" onClick={() => setShowSoporteModal(false)}>
                        <div className="relative max-w-4xl w-full max-h-[90vh] flex justify-center items-center" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setShowSoporteModal(false)} className="absolute -top-12 right-0 text-white text-3xl hover:text-gray-300">
                                <i className="fas fa-times"></i>
                            </button>
                            <img src={`${API}/${selectedSolicitud.soporte}`} alt="Soporte" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}