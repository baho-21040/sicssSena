import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
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

    // Filtros
    const [filter, setFilter] = useState('todas'); // todas, pendiente, aprobado, rechazado
    const [documentoFilter, setDocumentoFilter] = useState('');
    const [fechaFilter, setFechaFilter] = useState('');

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
        const interval = setInterval(fetchHistorial, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        filterSolicitudes();
    }, [solicitudes, filter, documentoFilter, fechaFilter]);

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
        let filtered = [...solicitudes];

        // Filtro por estado
        if (filter !== 'todas') {
            filtered = filtered.filter(solicitud => {
                const estado = solicitud.estado_general.toLowerCase();
                if (filter === 'pendiente') return estado.includes('pendiente');
                if (filter === 'aprobado') return estado.includes('aprobado');
                if (filter === 'rechazado') return estado.includes('rechazado');
                return true;
            });
        }

        // Filtro por documento
        if (documentoFilter.trim()) {
            filtered = filtered.filter(solicitud =>
                solicitud.documento_aprendiz.includes(documentoFilter.trim())
            );
        }

        // Filtro por fecha
        if (fechaFilter) {
            filtered = filtered.filter(solicitud => {
                const fechaSolicitud = new Date(solicitud.fecha_solicitud).toISOString().split('T')[0];
                return fechaSolicitud === fechaFilter;
            });
        }

        setFilteredSolicitudes(filtered);
    };

    const handleRestablecerFiltros = () => {
        setFilter('todas');
        setDocumentoFilter('');
        setFechaFilter('');
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
                fetchHistorial();
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
                fetchHistorial();
                setShowConfirmDeleteOneModal(false);
                setSolicitudToDelete(null);
                if (selectedSolicitud && selectedSolicitud.id_permiso === solicitudToDelete.id_permiso) {
                    setShowDetallesModal(false);
                    setSelectedSolicitud(null);
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

    const getEstadoBadge = (solicitud) => {
        let estado = solicitud.estado_display || solicitud.estado_general;

        if (estado === 'Pendiente Coordinador') {
            estado = 'Pendiente Coordinación';
        }

        if (estado.includes('Aprobado') || estado.includes('QR')) {
            return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">✓ {estado}</span>;
        } else if (estado.includes('Rechazado')) {
            return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">✗ {estado}</span>;
        } else if (estado.includes('Pendiente')) {
            return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">⏳ {estado}</span>;
        }
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">{estado}</span>;
    };

    const handleDownloadReport = () => {
        if (solicitudes.length === 0) {
            alert('No hay solicitudes para generar el reporte.');
            return;
        }

        // Mapeo de datos para el reporte a excel
        const dataToExport = solicitudes.map(solicitud => {
            let estado = solicitud.estado_general;
            if (estado === 'Pendiente Coordinador') estado = 'Pendiente Coordinación';
            if (estado === 'Aprobado') estado = 'Aceptada';
            if (estado === 'Rechazado') estado = 'Rechazada';

            // Excluir Pendiente Instructor si por alguna razón llegara (aunque el API lo filtra)
            if (estado === 'Pendiente Instructor') return null;

            return {
                'Fecha Solicitud': formatFechaHora(solicitud.fecha_solicitud),
                'Documento': solicitud.documento_aprendiz,
                'Apellido Nombre': `${solicitud.apellido_aprendiz} ${solicitud.nombre_aprendiz}`,
                'Programa': solicitud.nombre_programa,
                'Ficha': solicitud.numero_ficha,
                'Motivo': getMotivoTexto(solicitud.motivo, solicitud.descripcion),
                'Hora Salida': formatTime12h(solicitud.hora_salida),
                'Hora Regreso': formatTime12h(solicitud.hora_regreso) || 'N/A',
                'Estado': estado
            };
        }).filter(item => item !== null);

        // Crear hoja de trabajo
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // Ajustar ancho de columnas
        const wscols = [
            { wch: 20 }, // Fecha Solicitud
            { wch: 15 }, // Documento
            { wch: 30 }, // Apellido Nombre
            { wch: 30 }, // Programa
            { wch: 10 }, // Ficha
            { wch: 25 }, // Motivo
            { wch: 15 }, // Hora Salida
            { wch: 15 }, // Hora Regreso
            { wch: 20 }  // Estado
        ];
        ws['!cols'] = wscols;

        // Activar filtros automáticos
        if (dataToExport.length > 0) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
        }

        // Crear libro y agregar hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte Solicitudes");

        // Descargar archivo
        XLSX.writeFile(wb, `Reporte_Solicitudes_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) {
        return (
            <DashboardLayout title="Historial de Solicitudes">
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Historial de Solicitudes">
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 pt-24">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-full">
                                    <i className="fas fa-history text-2xl"></i>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                        Historial de Solicitudes
                                    </h1>
                                    <p className="text-gray-600">Consulta todas las solicitudes que el aprendiz ha gestionado</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <div>
                                    <p className="text-sm text-gray-500">Total de solicitudes</p>
                                    <p className="text-3xl font-bold text-indigo-600">{filteredSolicitudes.length}</p>
                                </div>
                                <button
                                    onClick={handleDownloadReport}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold shadow-md flex items-center gap-2"
                                >
                                    <i className="fas fa-file-excel"></i> Descargar Reporte
                                </button>
                            </div>
                        </div>

                        {/* Barra de Filtros */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            {/* Filtro por Documento */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <i className="fas fa-id-card mr-2"></i>Buscar por Documento
                                </label>
                                <input
                                    type="text"
                                    value={documentoFilter}
                                    onChange={(e) => setDocumentoFilter(e.target.value)}
                                    placeholder="Ej: 1234567890"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Filtro por Fecha */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <i className="fas fa-calendar mr-2"></i>Filtrar por Fecha
                                </label>
                                <input
                                    type="date"
                                    value={fechaFilter}
                                    onChange={(e) => setFechaFilter(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Botón Restablecer */}
                            <div className="flex items-end">
                                <button
                                    onClick={handleRestablecerFiltros}
                                    className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition font-semibold"
                                >
                                    <i className="fas fa-redo mr-2"></i>Restablecer
                                </button>
                            </div>

                            {/* Botón Vaciar Historial */}
                            <div className="flex items-end">
                                <button
                                    onClick={() => setShowConfirmDeleteModal(true)}
                                    className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
                                    disabled={solicitudes.length === 0}
                                >
                                    <i className="fas fa-trash mr-2"></i>Vaciar Historial
                                </button>
                            </div>
                        </div>

                        {/* Filtros por Estado (Tabs) */}
                        <div className="flex gap-2 flex-wrap">
                            {['todas', 'pendiente', 'aprobado', 'rechazado'].map((estado) => (
                                <button
                                    key={estado}
                                    onClick={() => setFilter(estado)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${filter === estado
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {estado.charAt(0).toUpperCase() + estado.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tabla de Solicitudes */}
                    {error ? (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                            <p>{error}</p>
                        </div>
                    ) : filteredSolicitudes.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                            <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                            <p className="text-xl text-gray-600">No hay solicitudes con el filtro seleccionado</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">Fecha y Hora</th>
                                            <th className="px-4 py-3 text-left font-semibold">Aprendiz</th>
                                            <th className="px-4 py-3 text-left font-semibold">Motivo</th>
                                            <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSolicitudes.map((solicitud, index) => (
                                            <tr
                                                key={solicitud.id_permiso}
                                                className={`border-b hover:bg-indigo-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                    }`}
                                            >
                                                <td className="px-4 py-3 text-sm font-medium text-gray-700">
                                                    {formatFechaHora(solicitud.fecha_solicitud)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-gray-800">
                                                        {solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}
                                                    </p>
                                                    <p className="text-xs text-gray-500">Doc: {solicitud.documento_aprendiz}</p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {getMotivoTexto(solicitud.motivo, solicitud.descripcion)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getEstadoBadge(solicitud)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => openDetallesModal(solicitud)}
                                                        className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors mx-1"
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
                        </div>
                    )}
                </div>

                {/* Modal de Detalles */}
                {showDetallesModal && selectedSolicitud && (
                    <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeDetallesModal}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border-t-4 border-indigo-600">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 className="text-xl leading-6 font-bold text-indigo-700" id="modal-title">
                                            Detalles de la Solicitud
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            {!selectedSolicitud.estado_general.toLowerCase().includes('pendiente') && (
                                                <button
                                                    onClick={() => {
                                                        confirmDeleteOne(selectedSolicitud);
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 text-xl transition-colors"
                                                    title="Eliminar del historial"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            )}
                                            <button onClick={closeDetallesModal} className="text-gray-400 hover:text-gray-500 focus:outline-none">
                                                <span className="sr-only">Cerrar</span>
                                                <i className="fas fa-times text-xl"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Aprendiz y Fecha de Solicitud */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-indigo-600 uppercase font-bold mb-1">Aprendiz</p>
                                                <p className="text-sm font-medium text-gray-900">{selectedSolicitud.nombre_aprendiz} {selectedSolicitud.apellido_aprendiz}</p>
                                                <p className="text-xs text-gray-500">{selectedSolicitud.documento_aprendiz}</p>
                                                <p className="text-xs text-gray-500 mt-2">Programa: {selectedSolicitud.nombre_programa}</p>
                                                <p className="text-xs text-gray-500">Ficha: {selectedSolicitud.numero_ficha}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Fecha Solicitud</p>
                                                <p className="text-sm font-medium text-gray-900">{formatFechaHora(selectedSolicitud.fecha_solicitud)}</p>
                                                <div className="mt-2">
                                                    {getEstadoBadge(selectedSolicitud)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Motivo */}
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Motivo</p>
                                            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm text-gray-700">
                                                {getMotivoTexto(selectedSolicitud.motivo, selectedSolicitud.descripcion)}
                                            </div>
                                        </div>

                                        {/* Horario */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hora Salida</p>
                                                <p className="text-sm font-medium text-gray-900">{formatTime12h(selectedSolicitud.hora_salida)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hora Regreso</p>
                                                <p className="text-sm font-medium text-gray-900">{formatTime12h(selectedSolicitud.hora_regreso) || 'N/A'}</p>
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
                    <div className="fixed inset-0 z-[10000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
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
                    <div className="fixed inset-0 z-[10000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
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