import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import DashboardLayout from '../../../components/DashboardLayout';

import { API_BASE_URL } from '../../../config/api.js';

export default function Programas() {
    const { user } = useUser();
    const [programas, setProgramas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modals state
    const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
    const [programaToDelete, setProgramaToDelete] = useState(null);

    const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
    const [programaToToggle, setProgramaToToggle] = useState(null);

    // Filtros
    const [filterEstado, setFilterEstado] = useState('todos');
    const [filterNivel, setFilterNivel] = useState('todos');

    const messageRef = useRef(null);

    const API_URL = API_BASE_URL;

    const fetchProgramas = async (term = '', estado = 'todos', nivel = 'todos') => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/coordinacion/programas?q=${term}&estado=${estado}&nivel=${nivel}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar programas');
            }

            const data = await response.json();
            if (data.status === 'ok') {
                setProgramas(data.programas);
            } else {
                setError(data.message || 'Error desconocido');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProgramas(searchTerm, filterEstado, filterNivel);
    }, [filterEstado, filterNivel]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProgramas(searchTerm, filterEstado, filterNivel);
    };

    // --- Delete Logic ---
    const openDeleteModal = (programa) => {
        setProgramaToDelete(programa);
        setModalEliminarOpen(true);
    };

    const closeDeleteModal = () => {
        setProgramaToDelete(null);
        setModalEliminarOpen(false);
    };

    const handleDelete = async () => {
        if (!programaToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/coordinacion/programas/${programaToDelete.id_programa}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.status === 'ok') {
                setSuccessMessage('Programa eliminado exitosamente.');
                setProgramas(programas.filter(p => p.id_programa !== programaToDelete.id_programa));
                closeDeleteModal();
                scrollToMessage();
            } else {
                alert(data.message || 'Error al eliminar programa');
            }
        } catch (err) {
            alert('Error de conexión al eliminar programa');
        }
    };

    // --- Toggle Status Logic ---
    const openEstadoModal = (programa) => {
        setProgramaToToggle(programa);
        setModalEstadoOpen(true);
    };

    const closeEstadoModal = () => {
        setProgramaToToggle(null);
        setModalEstadoOpen(false);
    };

    const handleToggleStatus = async () => {
        if (!programaToToggle) return;

        const nuevoEstado = programaToToggle.estado === 'Activo' ? 'Inactivo' : 'Activo';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/coordinacion/programas/${programaToToggle.id_programa}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            const data = await response.json();

            if (response.ok && data.status === 'ok') {
                setSuccessMessage(`Estado actualizado a ${nuevoEstado}.`);
                setProgramas(programas.map(p =>
                    p.id_programa === programaToToggle.id_programa ? { ...p, estado: nuevoEstado } : p
                ));
                closeEstadoModal();
                scrollToMessage();
            } else {
                alert(data.message || 'Error al actualizar estado');
            }
        } catch (err) {
            alert('Error de conexión al actualizar estado');
        }
    };

    const scrollToMessage = () => {
        setTimeout(() => {
            if (messageRef.current) {
                messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            setTimeout(() => setSuccessMessage(''), 3000);
        }, 100);
    };

    return (
        <DashboardLayout >
            <div className="bg-[#f7f9fb] p-8 font-sans">
                <div className="max-w-[1400px] mx-auto bg-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] p-6">

                    {/* Header de Gestión */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b-2 border-[#e4ffd7]">
                        <h2 className="text-2xl font-bold text-[#2A7D00] mb-4 md:mb-0 flex items-center gap-2">
                            <i className="fas fa-chalkboard-teacher"></i>Programas de Formación
                        </h2>

                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">

                            {/* Filtros */}
                            <select
                                value={filterEstado}
                                onChange={(e) => setFilterEstado(e.target.value)}
                                className="p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900]"
                            >
                                <option value="todos">Todos los Estados</option>
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>

                            <select
                                value={filterNivel}
                                onChange={(e) => setFilterNivel(e.target.value)}
                                className="p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900]"
                            >
                                <option value="todos">Todos los Niveles</option>
                                <option value="Tecnico">Técnico</option>
                                <option value="Tecnologo">Tecnólogo</option>
                                <option value="Operario">Operario</option>
                            </select>

                            <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                                <input
                                    type="text"
                                    placeholder="Buscar por Nombre o Ficha..."
                                    className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900] w-[300px] transition-all duration-300"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const soloLetras = /^[A-Za-zÁ-Úá-úñÑ\s]*$/;
                                        const soloNumeros = /^[0-9]*$/;
                                        if (value === "" || soloLetras.test(value) || soloNumeros.test(value)) {
                                            setSearchTerm(value);
                                        }
                                    }}
                                />
                                <button type="submit" className="bg-[#f0f0f0] text-[#666] border border-[#ddd] px-4 py-2.5 rounded-lg hover:bg-[#e4ffd7] hover:text-[#2A7D00] transition-colors duration-300">
                                    <i className="fas fa-search"></i>
                                </button>
                            </form>

                            <div className="flex gap-3">
                                <Link
                                    to="/coordinacion/inicio"
                                    className="bg-[#6c757d] text-white px-5 py-2.5 rounded-lg hover:bg-[#5a6268] transition-colors font-bold flex items-center gap-2"
                                    title="Volver al Dashboard"
                                >
                                    <i className="fas fa-home"></i> Inicio
                                </Link>

                                <Link
                                    to="/coordinacion/registrarprograma"
                                    className="bg-[#39A900] text-white px-5 py-2.5 rounded-lg hover:bg-[#2A7D00] transition-colors font-bold flex items-center gap-2"
                                    title="Registrar un nuevo Programa"
                                >
                                    <i className="fas fa-plus-circle"></i> Formación
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Mensajes de Estado */}
                    {successMessage && (
                        <div ref={messageRef} className="bg-[#d4edda] border border-[#c3e6cb] text-[#155724] p-4 mb-5 rounded-lg font-bold flex items-center gap-2 shadow-sm">
                            <i className="fas fa-check-circle text-xl"></i>
                            <p>{successMessage}</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-[#f8d7da] border border-[#f5c6cb] text-[#721c24] p-4 mb-5 rounded-lg font-bold flex items-center gap-2 shadow-sm">
                            <i className="fas fa-times-circle text-xl"></i>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Tabla de Resultados */}
                    {loading ? (
                        <div className="text-center py-10">
                            <i className="fas fa-spinner fa-spin text-4xl text-[#39A900]"></i>
                            <p className="mt-2 text-gray-600">Cargando programas...</p>
                        </div>
                    ) : programas.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse mt-5 text-[0.95em]">
                                <thead>
                                    <tr className="bg-[#e4ffd7] text-[#2A7D00] uppercase text-[0.85em] tracking-wide font-bold">
                                        <th className="p-3 border-b border-[#eee]">Nombre del Programa</th>
                                        <th className="p-3 border-b border-[#eee]">Ficha</th>
                                        <th className="p-3 border-b border-[#eee]">Nivel</th>
                                        <th className="p-3 border-b border-[#eee]">Centro</th>
                                        <th className="p-3 border-b border-[#eee]">Jornada</th>
                                        <th className="p-3 border-b border-[#eee]">Estado</th>
                                        <th className="p-3 border-b border-[#eee] text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                    {programas.map((programa) => (
                                        <tr key={programa.id_programa} className="hover:bg-[#f9f9f9] border-b border-[#eee] transition-colors">
                                            <td className="p-3">{programa.nombre_programa}</td>
                                            <td className="p-3">{programa.numero_ficha}</td>
                                            <td className="p-3">{programa.nivel}</td>
                                            <td className="p-3">{programa.centro_formacion}</td>
                                            <td className="p-3">{programa.nombre_jornada}</td>
                                            <td className="p-3">
                                                <span className={`inline-block px-2.5 py-1 rounded-[20px] text-[0.8em] font-semibold text-white text-center min-w-[80px] ${programa.estado === 'Activo' ? 'bg-[#28a745]' : 'bg-[#e71a1a]'
                                                    }`}>
                                                    {programa.estado}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-2 min-w-[120px]">
                                                    <Link
                                                        to={`/coordinacion/editarprograma/${programa.id_programa}`}
                                                        className="w-[35px] h-[35px] rounded-full bg-[#ffc107] text-[#333] flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all"
                                                        title="Editar Programa"
                                                    >
                                                        <i className="fas fa-edit text-[1.1em]"></i>
                                                    </Link>

                                                    <button
                                                        onClick={() => openEstadoModal(programa)}
                                                        className={`w-[35px] h-[35px] rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all text-white ${programa.estado === 'Activo' ? 'bg-[#28a745]' : 'bg-[#505050]'
                                                            }`}
                                                        title={programa.estado === 'Activo' ? 'Desactivar Programa' : 'Activar Programa'}
                                                    >
                                                        <i className={`fas ${programa.estado === 'Activo' ? 'fa-toggle-on' : 'fa-toggle-off'} text-[1.1em]`}></i>
                                                    </button>

                                                    <button
                                                        onClick={() => openDeleteModal(programa)}
                                                        className="w-[35px] h-[35px] rounded-full bg-[#ff0019] text-white flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all"
                                                        title="Eliminar Programa"
                                                    >
                                                        <i className="fas fa-trash-alt text-[1.1em]"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-[#666] flex flex-col gap-2">
                            <p className="text-lg">No se encontraron programas de formación que coincidan con la búsqueda: "{searchTerm}".</p>
                            <button
                                onClick={() => { setSearchTerm(''); fetchProgramas(''); }}
                                className="text-[#447d0f] font-bold hover:text-[#65c709] hover:underline transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-sync"></i> Mostrar todos los programas
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal de Eliminación */}
                {modalEliminarOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4">
                        <div className="bg-white rounded-[10px] shadow-2xl max-w-[450px] w-[90%] p-8 text-center">
                            <i className="fas fa-exclamation-triangle text-[3.5em] text-[#ff0019] mb-4 block"></i>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmar Eliminación</h3>
                            <p className="text-gray-600 mb-6">
                                ¿Está seguro de que desea eliminar el programa: <strong>{programaToDelete?.nombre_programa} | {programaToDelete?.numero_ficha}</strong>?
                                <br />Esta acción es irreversible.
                            </p>
                            <div className="flex gap-4 justify-center mt-6">
                                <button
                                    onClick={closeDeleteModal}
                                    className="px-5 py-2.5 bg-[#ccc] text-[#333] rounded-md font-bold hover:bg-gray-400 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-5 py-2.5 bg-[#dc3545] text-white rounded-md font-bold hover:bg-[#c82333] transition-colors flex items-center gap-2"
                                >
                                    <i className="fas fa-trash-alt"></i> Sí, Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Estado */}
                {modalEstadoOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4">
                        <div className="bg-white rounded-[10px] shadow-2xl max-w-[450px] w-[90%] p-8 text-center">
                            <i className="fas fa-exchange-alt text-[3.5em] text-[#39A900] mb-4 block"></i>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmar Cambio de Estado</h3>
                            <p className="text-gray-600 mb-6">
                                ¿Desea cambiar el estado del programa <strong>{programaToToggle?.nombre_programa}</strong> de <strong>{programaToToggle?.estado}</strong> a <strong>{programaToToggle?.estado === 'Activo' ? 'Inactivo' : 'Activo'}</strong>?
                            </p>
                            <div className="flex gap-4 justify-center mt-6">
                                <button
                                    onClick={closeEstadoModal}
                                    className="px-5 py-2.5 bg-[#ccc] text-[#333] rounded-md font-bold hover:bg-gray-400 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleToggleStatus}
                                    className="px-5 py-2.5 bg-[#39A900] text-white rounded-md font-bold hover:bg-[#2A7D00] transition-colors flex items-center gap-2"
                                >
                                    <i className="fas fa-check"></i> Sí, Cambiar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
