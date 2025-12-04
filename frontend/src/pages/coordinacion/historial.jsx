import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';
import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

export default function HistorialCoordinacion() {
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
            const response = await fetch(`${API}/api/coordinacion/historial`, {
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
            const response = await fetch(`${API}/api/coordinacion/historial`, {
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
            const response = await fetch(`${API}/api/coordinacion/solicitud/${solicitudToDelete.id_permiso}`, {
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
            } else {
                alert(data.message || 'Error al eliminar la solicitud');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error de conexión al eliminar la solicitud');
        }
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
        // 1. Aquí obtenemos el estado original
        let estado = solicitud.estado_display || solicitud.estado_general;

        // 2. AGREGA ESTO: Si el estado es "Pendiente Coordinador", lo cambiamos visualmente
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

        // Filtrar solo Aceptadas y Rechazadas
        const solicitudesFiltradas = solicitudes.filter(solicitud => {
            const estado = solicitud.estado_general;
            return estado === 'Aprobado Final' || estado === 'Rechazado';
        });

        if (solicitudesFiltradas.length === 0) {
            alert('No hay solicitudes aceptadas o rechazadas para generar el reporte.');
            return;
        }

        // Mapeo de datos para el reporte
        const dataToExport = solicitudesFiltradas.map(solicitud => {
            let estado = solicitud.estado_general;
            if (estado === 'Aprobado Final') estado = 'Aceptada';
            if (estado === 'Rechazado') estado = 'Rechazada';

            // Motivo de rechazo/estado
            let motivoEstado = '';
            if (estado === 'Rechazada') {
                motivoEstado = solicitud.motivo_rechazo_coordinador || solicitud.motivo_rechazo_instructor || 'Sin motivo especificado';
            } else if (estado === 'Aceptada') {
                motivoEstado = 'Aprobado';
            }

            // Instructor
            const instructorNombre = (solicitud.nombre_instructor && solicitud.apellido_instructor)
                ? `${solicitud.nombre_instructor} ${solicitud.apellido_instructor}`
                : 'N/A';

            const instructorDocumento = solicitud.documento_instructor || 'N/A';

            return {
                'Fecha Solicitud': formatFechaHora(solicitud.fecha_solicitud),
                'Documento': solicitud.documento_aprendiz,
                'Apellido Nombre': `${solicitud.apellido_aprendiz} ${solicitud.nombre_aprendiz}`,
                'Programa': solicitud.nombre_programa,
                'Ficha': solicitud.numero_ficha,
                'Motivo Solicitud': getMotivoTexto(solicitud.motivo, solicitud.descripcion),
                'Hora Salida': formatTime12h(solicitud.hora_salida),
                'Hora Regreso': formatTime12h(solicitud.hora_regreso) || 'N/A',
                'Documento Instructor': instructorDocumento,
                'Instructor': instructorNombre,
                'Estado': estado,
                'Motivo Estado': motivoEstado
            };
        });

        // Crear hoja de trabajo
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // Ajustar ancho de columnas
        const wscols = [
            { wch: 20 }, // Fecha Solicitud
            { wch: 15 }, // Documento
            { wch: 30 }, // Apellido Nombre
            { wch: 30 }, // Programa
            { wch: 10 }, // Ficha
            { wch: 25 }, // Motivo Solicitud
            { wch: 15 }, // Hora Salida
            { wch: 15 }, // Hora Regreso
            { wch: 15 }, // Documento Instructor
            { wch: 25 }, // Instructor
            { wch: 15 }, // Estado
            { wch: 30 }  // Motivo Estado
        ];
        ws['!cols'] = wscols;

        // Activar filtros automáticos
        if (dataToExport.length > 0) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
        }

        // Crear libro y agregar hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial Coordinacion");

        // Descargar archivo
        XLSX.writeFile(wb, `Reporte_Coordinacion_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) {
        return (
            <DashboardLayout title="Historial de Salidas">
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Historial de Salidas">
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 pt-24">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                        <Link to="/coordinacion/inicio" className="btn-back">
                            <i className="fas fa-chevron-left"></i> Volver al Inicio
                        </Link>

                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-full">
                                    <i className="fas fa-history text-2xl"></i>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                        Historial de Salidas
                                    </h1>
                                    <p className="text-gray-600">Gestiona el historial de solicitudes procesadas</p>
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
                                    className={`px-4 py-2 rounded-lg font-semibold transition ${filter === estado
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                            <p className="text-xl text-gray-600">No hay solicitudes en el historial</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                                            <th className="px-4 py-3 text-left font-semibold">Aprendiz</th>
                                            <th className="px-4 py-3 text-left font-semibold">Documento</th>
                                            <th className="px-4 py-3 text-left font-semibold">Programa</th>
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
                                                <td className="px-4 py-3 text-sm">
                                                    {formatFechaHora(solicitud.fecha_solicitud)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-gray-800">
                                                        {solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {solicitud.documento_aprendiz}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <p className="font-medium">{solicitud.nombre_programa}</p>
                                                    <p className="text-gray-500">Ficha: {solicitud.numero_ficha}</p>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {getMotivoTexto(solicitud.motivo, solicitud.descripcion)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getEstadoBadge(solicitud)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSolicitud(solicitud);
                                                                setShowDetallesModal(true);
                                                            }}
                                                            className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 transition text-sm"
                                                        >
                                                            <i className="fas fa-eye"></i>
                                                        </button>

                                                    </div>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pt-20 p-4" onClick={() => setShowDetallesModal(false)}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Detalles de la Solicitud</h2>
                                    <div className="flex items-center gap-4">
                                        {!selectedSolicitud.estado_general.toLowerCase().includes('pendiente') && (
                                            <button
                                                onClick={() => {
                                                    confirmDeleteOne(selectedSolicitud);
                                                }}
                                                className="text-white hover:text-red-200 text-xl transition-colors"
                                                title="Eliminar del historial"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        )}
                                        <button onClick={() => setShowDetallesModal(false)} className="text-white hover:text-gray-200 text-3xl">&times;</button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Aprendiz y Fecha de Solicitud */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-indigo-600 uppercase font-semibold mb-2">Aprendiz</p>
                                        <p className="font-bold text-gray-800">{selectedSolicitud.nombre_aprendiz} {selectedSolicitud.apellido_aprendiz}</p>
                                        <p className="text-sm text-gray-600">Doc: {selectedSolicitud.documento_aprendiz}</p>
                                        <p className="text-sm text-gray-600 mt-2">Programa: {selectedSolicitud.nombre_programa}</p>
                                        <p className="text-sm text-gray-600">Ficha: {selectedSolicitud.numero_ficha}</p>
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

                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg col-span-2">
                                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Motivo</p>
                                        <p className="text-sm text-gray-800 italic">{getMotivoTexto(selectedSolicitud.motivo, selectedSolicitud.descripcion)}</p>
                                    </div>

                                    {/* Estado Instructor */}
                                    {selectedSolicitud.estado_instructor && (
                                        <div className={`p-4 rounded-lg col-span-2 border-l-4 ${selectedSolicitud.estado_instructor === 'Aprobado'
                                            ? 'bg-green-50 border-green-500'
                                            : 'bg-red-50 border-red-500'
                                            }`}>
                                            <p className="text-xs uppercase font-semibold mb-1">Estado Instructor</p>
                                            <p className="font-semibold">{selectedSolicitud.estado_instructor}</p>
                                            {selectedSolicitud.nombre_instructor && (
                                                <p className="text-sm mt-1">
                                                    <strong>Instructor:</strong> {selectedSolicitud.nombre_instructor} {selectedSolicitud.apellido_instructor}
                                                </p>
                                            )}
                                            {selectedSolicitud.motivo_rechazo_instructor && (
                                                <p className="text-sm mt-1">Motivo: {selectedSolicitud.motivo_rechazo_instructor}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Estado Coordinador */}
                                    {(selectedSolicitud.estado_coordinador || selectedSolicitud.estado_general === 'Rechazado') && (
                                        <div className={`p-4 rounded-lg col-span-2 border-l-4 ${selectedSolicitud.estado_coordinador === 'Aprobado' || selectedSolicitud.estado_general === 'Aprobado Final'
                                            ? 'bg-green-50 border-green-500'
                                            : 'bg-red-50 border-red-500'
                                            }`}>
                                            <p className="text-xs uppercase font-semibold mb-1">Estado Coordinación</p>
                                            <p className="font-semibold">{selectedSolicitud.estado_coordinador || selectedSolicitud.estado_general}</p>
                                            {(selectedSolicitud.motivo_rechazo_coordinador) ? (
                                                <p className="text-sm mt-1">Motivo: {selectedSolicitud.motivo_rechazo_coordinador}</p>
                                            ) : selectedSolicitud.estado_general === 'Rechazado' && (
                                                <p className="text-sm mt-1">Motivo: Rechazado por sistema o sin motivo especificado</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Botones de Soporte y QR */}
                                    {selectedSolicitud.soporte && (
                                        <div className="col-span-2">
                                            <button
                                                onClick={() => setShowSoporteModal(true)}
                                                className="w-full bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition"
                                            >
                                                <i className="fas fa-paperclip mr-2"></i>Visualizar Soporte
                                            </button>
                                        </div>
                                    )}

                                    {selectedSolicitud.qr && (
                                        <div className="col-span-2">
                                            <button
                                                onClick={() => setShowQRModal(true)}
                                                className="w-full bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-600 transition"
                                            >
                                                <i className="fas fa-qrcode mr-2"></i>Ver Código QR
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Soporte */}
                {showSoporteModal && selectedSolicitud?.soporte && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 z-[1100] flex justify-center items-center p-4" onClick={() => setShowSoporteModal(false)}>
                        <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowSoporteModal(false)}
                                className="absolute -top-10 right-0 text-white text-4xl hover:text-gray-300"
                            >
                                &times;
                            </button>
                            <img
                                src={`${API}/${selectedSolicitud.soporte}`}
                                alt="Soporte"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl mx-auto"
                            />
                        </div>
                    </div>
                )}

                {/* Modal de QR */}
                {showQRModal && selectedSolicitud?.qr && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowQRModal(false)}>
                        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-2xl font-bold text-center mb-4 text-indigo-600">Código QR de Salida</h3>
                            <div className="flex justify-center mb-4">
                                <QRCodeSVG value={selectedSolicitud.qr} size={256} />
                            </div>
                            <p className="text-center text-gray-600 text-sm mb-4">
                                Presenta este código en vigilancia para registrar tu salida
                            </p>
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition font-semibold"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal de Confirmación - Vaciar Todo */}
                {showConfirmDeleteModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-red-600 mb-4">
                                <i className="fas fa-exclamation-triangle mr-2"></i>Confirmar Eliminación
                            </h3>
                            <p className="text-gray-700 mb-6">
                                ¿Estás seguro de que deseas vaciar todo el historial? Esta acción ocultará todas las solicitudes procesadas.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmDeleteModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteAll}
                                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Confirmación - Eliminar Una */}
                {showConfirmDeleteOneModal && solicitudToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-red-600 mb-4">
                                <i className="fas fa-exclamation-triangle mr-2"></i>Confirmar Eliminación
                            </h3>
                            <p className="text-gray-700 mb-6">
                                ¿Estás seguro de que deseas eliminar la solicitud de <strong>{solicitudToDelete.nombre_aprendiz} {solicitudToDelete.apellido_aprendiz}</strong>?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmDeleteOneModal(false);
                                        setSolicitudToDelete(null);
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteOne}
                                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
