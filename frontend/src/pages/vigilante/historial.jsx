import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';
import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

export default function HistorialVigilante() {
    const { user } = useUser();
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modales
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [selectedRegistro, setSelectedRegistro] = useState(null);
    const [showSoporteModal, setShowSoporteModal] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
    const [registroToDelete, setRegistroToDelete] = useState(null);

    useEffect(() => {
        fetchHistorial();
        const interval = setInterval(fetchHistorial, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchHistorial = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/vigilante/historial`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'ok') {
                setHistorial(data.historial);
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

    const handleVaciarHistorial = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/vigilante/historial`, {
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
                alert(data.message || 'Error al vaciar el historial');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error de conexión al vaciar el historial');
        }
    };

    const handleEliminarRegistro = async () => {
        if (!registroToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/vigilante/historial/${registroToDelete.id_acceso}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'ok') {
                fetchHistorial();
                setShowSingleDeleteModal(false);
                setRegistroToDelete(null);
                if (selectedRegistro && selectedRegistro.id_acceso === registroToDelete.id_acceso) {
                    closeDetallesModal();
                }
            } else {
                alert(data.message || 'Error al eliminar el registro');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error de conexión al eliminar el registro');
        }
    };

    const openDetallesModal = (registro) => {
        setSelectedRegistro(registro);
        setShowDetallesModal(true);
    };

    const closeDetallesModal = () => {
        setShowDetallesModal(false);
        setSelectedRegistro(null);
    };

    const openSingleDeleteModal = (registro) => {
        setRegistroToDelete(registro);
        setShowSingleDeleteModal(true);
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

    if (loading) {
        return (
            <DashboardLayout title="Historial de Accesos">
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Historial de Accesos">
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
                                        Historial de Accesos
                                    </h1>
                                    <p className="text-gray-600">Registro de entradas y salidas gestionadas</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <button
                                    onClick={() => setShowConfirmDeleteModal(true)}
                                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-semibold shadow-md flex items-center gap-2"
                                    disabled={historial.length === 0}
                                >
                                    <i className="fas fa-trash"></i> Vaciar Todo
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Historial */}
                    {error ? (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                            <p>{error}</p>
                        </div>
                    ) : historial.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                            <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                            <p className="text-xl text-gray-600">No hay registros en el historial</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">Hora</th>
                                            <th className="px-4 py-3 text-left font-semibold">Documento</th>
                                            <th className="px-4 py-3 text-left font-semibold">Aprendiz</th>
                                            <th className="px-4 py-3 text-left font-semibold">Tipo Acceso</th>
                                            <th className="px-4 py-3 text-left font-semibold">Motivo</th>
                                            <th className="px-4 py-3 text-center font-semibold">Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.map((registro, index) => (
                                            <tr
                                                key={registro.id_acceso}
                                                className={`border-b hover:bg-indigo-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                            >
                                                <td className="px-4 py-3 text-sm font-medium text-gray-700">
                                                    {formatFechaHora(registro.fecha_acceso)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {registro.documento_aprendiz}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-gray-800">
                                                        {registro.nombre_aprendiz} {registro.apellido_aprendiz}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${registro.tipo_acceso === 'SALIDA'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {registro.tipo_acceso === 'ENTRADA'
                                                            ? 'Salida/Entrada'
                                                            : (registro.tipo_acceso === 'SALIDA' && registro.hora_regreso && registro.hora_regreso !== 'No aplica'
                                                                ? 'Sale y regresa'
                                                                : 'Salida')
                                                        }
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {getMotivoTexto(registro.motivo, registro.descripcion)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => openDetallesModal(registro)}
                                                        className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
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
                {showDetallesModal && selectedRegistro && (
                    <div className="fixed top-16 inset-x-0 bottom-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className=" flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeDetallesModal}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border-t-4 border-indigo-600">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 className="text-xl leading-6 font-bold text-indigo-700" id="modal-title">
                                            Detalles del Acceso
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openSingleDeleteModal(selectedRegistro)}
                                                className="text-red-500 hover:text-red-700 focus:outline-none p-1"
                                                title="Eliminar registro"
                                            >
                                                <i className="fas fa-trash-alt text-xl"></i>
                                            </button>
                                            <button onClick={closeDetallesModal} className="text-gray-400 hover:text-gray-500 focus:outline-none p-1">
                                                <span className="sr-only">Cerrar</span>
                                                <i className="fas fa-times text-xl"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Estado QR */}
                                        <div className="bg-gray-100 p-2 rounded-lg text-center font-bold text-sm">
                                            <span className="text-gray-600">QR YA ESCANEADO</span>
                                        </div>

                                        {/* Aprendiz y Fecha */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-indigo-600 uppercase font-bold mb-1">Aprendiz</p>
                                                <p className="text-sm font-medium text-gray-900">{selectedRegistro.nombre_aprendiz} {selectedRegistro.apellido_aprendiz}</p>
                                                <p className="text-sm text-gray-500">{selectedRegistro.documento_aprendiz}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hora - Fecha</p>
                                                <p className="text-xs font-medium text-gray-900">{formatFechaHora(selectedRegistro.fecha_acceso)}</p>
                                            </div>
                                        </div>

                                        {/* Formación */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Formación</p>
                                                <p className="text-sm max-sm:text-xs text-gray-900">{selectedRegistro.nombre_programa}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500"> <strong>Ficha:</strong> {selectedRegistro.numero_ficha}</p>

                                                <p className="text-xs text-gray-500"><strong>Jornada:</strong> {selectedRegistro.nombre_jornada}</p>


                                            </div>
                                        </div>

                                        {/* Instructor y Coordinador */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Instructor</p>
                                                <p className="text-xs font-medium text-gray-900">{selectedRegistro.nombre_instructor}</p>
                                                <p className="text-xs font-medium text-gray-900">{selectedRegistro.apellido_instructor} </p>
                                                <p className="text-xs text-gray-500">{selectedRegistro.documento_instructor}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Coordinación</p>
                                                {selectedRegistro.nombre_coordinador ? (
                                                    <>
                                                        <p className="text-xs font-medium text-gray-900">{selectedRegistro.nombre_coordinador}</p>
                                                        <p className="text-xs font-medium text-gray-900"> {selectedRegistro.apellido_coordinador}</p>

                                                        <p className="text-xs text-gray-500">{selectedRegistro.documento_coordinador}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No requiere aprobación</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Motivo */}
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Motivo</p>
                                            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-xs text-gray-700">
                                                {getMotivoTexto(selectedRegistro.motivo, selectedRegistro.descripcion)}
                                            </div>
                                        </div>

                                        {/* Horario */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hora Salida</p>
                                                <p className="text-sm font-medium text-gray-900">{formatTime12h(selectedRegistro.hora_salida)}</p>
                                            </div>
                                            {selectedRegistro.hora_regreso && (
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hora Regreso</p>
                                                    <p className="text-sm font-medium text-gray-900">{formatTime12h(selectedRegistro.hora_regreso)}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Botón Soporte */}
                                        {selectedRegistro.soporte && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => setShowSoporteModal(true)}
                                                    className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-4 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                                                >
                                                    <i className="fas fa-paperclip"></i> Ver Soporte
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Confirmación Vaciar Todo */}
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
                                                ¿Vaciar historial?
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    Esta acción ocultará todos los registros de tu historial. No podrás deshacer esta acción.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={handleVaciarHistorial}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Sí, vaciar
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

                {/* Modal Confirmación Eliminar Un Registro */}
                {showSingleDeleteModal && (
                    <div className="fixed inset-0 z-[11000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowSingleDeleteModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <i className="fas fa-trash-alt text-red-600"></i>
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                ¿Eliminar registro?
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    ¿Estás seguro de que deseas eliminar este registro del historial?
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={handleEliminarRegistro}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Sí, eliminar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowSingleDeleteModal(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Soporte */}
                {showSoporteModal && selectedRegistro?.soporte && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-[1002] p-4" onClick={() => setShowSoporteModal(false)}>
                        <div className="relative max-w-4xl w-full max-h-[90vh] flex justify-center items-center" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setShowSoporteModal(false)} className="absolute -top-12 right-0 text-white text-3xl hover:text-gray-300">
                                <i className="fas fa-times"></i>
                            </button>
                            <img src={`${API}/${selectedRegistro.soporte}`} alt="Soporte" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
