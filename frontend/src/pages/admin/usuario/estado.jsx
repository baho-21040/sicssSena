import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import DashboardLayout from '../../../components/DashboardLayout';
import '../../../index.css';
import { API_BASE_URL } from '../../../config/api.js';

export default function Estado() {
    const { user } = useUser();
    const [documento, setDocumento] = useState('');
    const [usuariosEncontrados, setUsuariosEncontrados] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [modalDesactivarOpen, setModalDesactivarOpen] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');

    const messageRef = useRef(null);

    const API_URL = API_BASE_URL;

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!documento.trim()) return;

        setLoading(true);
        setError('');
        setUsuariosEncontrados([]);
        setUsuarioSeleccionado(null);
        setSuccessMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/usuarios?q=${documento}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al buscar usuarios');

            const data = await response.json();
            if (data.status === 'ok') {
                // Filtrar exactamente por documento si es necesario, o usar la búsqueda laxa
                // La API busca por nombre, apellido, documento, correo.
                // Aquí filtramos para asegurarnos que coincida el documento si el usuario busca por documento
                const exactMatches = data.usuarios.filter(u => u.documento.includes(documento));

                if (exactMatches.length === 0) {
                    setError(`No se encontró ningún usuario con el documento: ${documento}`);
                } else if (exactMatches.length === 1) {
                    setUsuarioSeleccionado(exactMatches[0]);
                    setNuevoEstado(exactMatches[0].estado);
                } else {
                    setUsuariosEncontrados(exactMatches);
                }
            } else {
                setError(data.message || 'Error desconocido');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = (usuario) => {
        setUsuarioSeleccionado(usuario);
        setNuevoEstado(usuario.estado);
        setUsuariosEncontrados([]); // Limpiar lista para mostrar detalle
    };

    const handleStatusChange = (e) => {
        setNuevoEstado(e.target.value);
    };

    const aplicarCambio = () => {
        if (nuevoEstado === 'Inactivo' && usuarioSeleccionado.estado === 'Activo') {
            setModalDesactivarOpen(true);
        } else {
            submitStatusChange();
        }
    };

    const submitStatusChange = async () => {
        if (!usuarioSeleccionado) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/usuarios/${usuarioSeleccionado.id_usuario}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            const data = await response.json();

            if (response.ok && data.status === 'ok') {
                setSuccessMessage('Estado actualizado correctamente.');
                setUsuarioSeleccionado({ ...usuarioSeleccionado, estado: nuevoEstado });
                setModalDesactivarOpen(false);

                // 💡 Paso 2: Llamar a scrollIntoView() después de actualizar el estado
                // Utilizamos setTimeout para asegurarnos de que el DOM se haya actualizado (el mensaje esté visible)
                setTimeout(() => {
                    if (messageRef.current) {
                        messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100); // Pequeño retraso para asegurar el render

                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                // Si hay error en la API
                setError(data.message || 'Error al actualizar estado');
                setModalDesactivarOpen(false);

                // 💡 Paso 2 (Error): Scroll también si hay error
                setTimeout(() => {
                    if (messageRef.current) {
                        messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);

            }
        } catch (err) {
            setError('Error de conexión al actualizar estado');
            setModalDesactivarOpen(false);

            // 💡 Paso 2 (Error de Conexión): Scroll
            setTimeout(() => {
                if (messageRef.current) {
                    messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    };

    return (
        <DashboardLayout title="Gestión de Estado de Cuenta">
            <div className="min-h-screen bg-gray-50 p-8 pt-24">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-lg p-8 relative">
                        <Link to="/inicioadmin" className="absolute top-8 left-8 text-gray-500 hover:text-gray-700 flex items-center transition">
                            <i className="fas fa-chevron-left mr-2"></i> Volver a Inicio
                        </Link>

                        {successMessage && (
                            <div ref={messageRef} className="mb-6 mt-8 bg-green-100 border-l-4 scroll-mt-40 border-green-500 text-green-700 p-4 rounded shadow-sm animate-fade-in">
                                <p className="font-bold"><i className="fas fa-check-circle mr-2"></i> Éxito</p>
                                <p>{successMessage}</p>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 mt-8 bg-red-100 border-l-4 scroll-mt-40 border-red-500 text-red-700 p-4 rounded shadow-sm animate-fade-in">
                                <p className="font-bold"><i className="fas fa-exclamation-triangle mr-2"></i> Error</p>
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="text-center mb-8 mt-12">
                            <div className="inline-block p-4 rounded-full bg-green-100 text-green-600 mb-4">
                                <i className="fas fa-toggle-on text-4xl"></i>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Gestión de Estado de Cuenta</h2>
                            <p className="text-gray-500 mt-2">Busque un usuario por documento para activar o desactivar su acceso.</p>
                        </div>

                        <form onSubmit={handleSearch} className="flex gap-4 mb-8">
                            <input style={{}}
                                type="number"
                                placeholder="Ingrese el número de documento..."
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6ed500] transition"
                                value={documento}
                                onChange={(e) => setDocumento(e.target.value)}
                                required
                            />
                            <button type="submit" className="bg-[#6ed500] text-white px-6 py-3 rounded-lg hover:bg-[#2A7D00] transition font-semibold flex items-center gap-2">
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                                Buscar
                            </button>
                        </form>

                        {/* Lista de usuarios encontrados (si hay múltiples) */}
                        {usuariosEncontrados.length > 0 && !usuarioSeleccionado && (
                            <div className="mb-8 animate-fade-in">
                                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                                    <i className="fas fa-users mr-2 text-green-600"></i> Múltiples Cuentas Encontradas
                                </h3>
                                <div className="space-y-3">
                                    {usuariosEncontrados.map((u) => (
                                        <div key={u.id_usuario}
                                            onClick={() => handleSelectUser(u)}
                                            className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 cursor-pointer transition group">
                                            <div>
                                                <p className="font-bold text-gray-800 group-hover:text-green-700">
                                                    <i className="fas fa-user mr-2 text-gray-400 group-hover:text-green-500"></i>
                                                    {u.nombre} {u.apellido}
                                                </p>
                                                <p className="text-sm text-gray-500 ml-6">
                                                    <i className="fas fa-id-card mr-1"></i> {u.documento} | <i className="fas fa-user-tag mr-1"></i> {u.nombre_rol}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {u.estado}
                                                </span>
                                                <i className="fas fa-chevron-right text-gray-300 group-hover:text-green-500"></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detalle de Usuario Seleccionado */}
                        {usuarioSeleccionado && (
                            <div className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-6 text-[#6ec500] font-bold text-lg border-b pb-2">
                                    <i className="fas fa-user-check"></i> Usuario Seleccionado
                                </div>

                                <div className="bg-gray-50 p-6 rounded-lg mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <p><strong className="text-gray-700">Nombre:</strong> {usuarioSeleccionado.nombre} {usuarioSeleccionado.apellido}</p>

                                    <p><strong className="text-gray-700">Documento:</strong> {usuarioSeleccionado.documento}</p>
                                    <p><strong className="text-gray-700">Correo Electrónico:</strong> {usuarioSeleccionado.correo}</p>

                                    <p><strong className="text-gray-700">Rol:</strong> {usuarioSeleccionado.nombre_rol || 'Sin rol'}</p>
                                    <p className="col-span-1 md:col-span-2">
                                        <strong className="text-gray-700">Estado Actual:</strong>
                                        <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${usuarioSeleccionado.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {usuarioSeleccionado.estado}
                                        </span>
                                    </p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                    <label className="block text-gray-700 font-bold mb-4">Seleccionar Nuevo Estado:</label>
                                    <div className="flex gap-4 mb-6 justify-center">
                                        {/* OFF Button (Inactivo) - Left */}
                                        <label className="cursor-pointer">
                                            <input
                                                type="radio"
                                                name="nuevo_estado"
                                                value="Inactivo"
                                                checked={nuevoEstado === 'Inactivo'}
                                                onChange={handleStatusChange}
                                                className="hidden"
                                            />
                                            <div className={`
                                                w-20 h-10 text-white border-2 
                                                font-bold text-lg text-center leading-10 
                                                cursor-pointer rounded-lg relative
                                                transition-all duration-200 ease-in-out
                                                ${nuevoEstado === 'Inactivo'
                                                    ? 'bg-red-800 text-white border-[rgb(255,138,138)] translate-y-0.5 shadow-[0_5px_0_#900,0_10px_0_#600]'
                                                    : 'bg-[#111] border-[#0f0] shadow-[0_5px_0_#0a0,0_10px_0_#050]'
                                                }
                                            `}>
                                                OFF
                                            </div>
                                        </label>

                                        {/* ON Button (Activo) - Right */}
                                        <label className="cursor-pointer">
                                            <input
                                                type="radio"
                                                name="nuevo_estado"
                                                value="Activo"
                                                checked={nuevoEstado === 'Activo'}
                                                onChange={handleStatusChange}
                                                className="hidden"
                                            />
                                            <div className={`
                                                w-20 h-10 text-white border-2 
                                                font-bold text-lg text-center leading-10 
                                                cursor-pointer rounded-lg relative
                                                transition-all duration-200 ease-in-out
                                                ${nuevoEstado === 'Activo'
                                                    ? 'bg-[rgb(86,235,0)] text-black border-[rgb(144,255,144)] translate-y-0.5 shadow-[0_5px_0_rgb(5,153,0),0_10px_0_rgb(17,102,0)]'
                                                    : 'bg-[#111] border-[#0f0] shadow-[0_5px_0_#0a0,0_10px_0_#050]'
                                                }
                                            `}>
                                                ON
                                            </div>
                                        </label>
                                    </div>

                                    <button
                                        onClick={aplicarCambio}
                                        className="w-full bg-[#6ed500] text-white py-3 rounded-lg hover:bg-[#2A7D00] transition font-bold flex items-center justify-center gap-2"
                                    >
                                        <i className="fas fa-sync-alt"></i> Aplicar Cambio
                                    </button>


                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal de Confirmación de Desactivación */}
                {modalDesactivarOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-scale-up">
                            <i className="fas fa-user-lock text-5xl text-yellow-400 mb-4"></i>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmar Desactivación</h3>
                            <p className="text-gray-600 mb-6">
                                Se desactivará la cuenta de <strong>{usuarioSeleccionado?.nombre} {usuarioSeleccionado?.apellido}</strong>.
                                <br />El usuario perderá acceso. ¿Desea continuar?
                            </p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => setModalDesactivarOpen(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={submitStatusChange}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center gap-2"
                                >
                                    <i className="fas fa-power-off"></i> Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}