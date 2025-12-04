import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import DashboardLayout from '../../../components/DashboardLayout';
import { API_BASE_URL } from '../../../config/api.js';

export default function BuscarUsuario() {
    const { user } = useUser();
    const [usuarios, setUsuarios] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('');
    const [rolFilter, setRolFilter] = useState('');
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const messageRef = useRef(null);

    const API_URL = API_BASE_URL;

    const fetchUsuarios = async (term = '', estado = '', rol = '') => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            let url = `${API_URL}/api/coordinacion/usuarios?q=${term}`;
            if (estado) url += `&estado=${estado}`;
            if (rol) url += `&rol=${rol}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar usuarios');
            }

            const data = await response.json();
            if (data.status === 'ok') {
                setUsuarios(data.usuarios);
            } else {
                setError(data.message || 'Error desconocido');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await fetch(`${API_URL}/api/roles`);
            const data = await response.json();
            if (data.status === 'ok') {
                setRoles(data.roles);
            }
        } catch (error) {
            console.error('Error cargando roles:', error);
        }
    };

    useEffect(() => {
        fetchUsuarios();
        fetchRoles();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsuarios(searchTerm, estadoFilter, rolFilter);
    };

    const handleEstadoChange = (e) => {
        const newEstado = e.target.value;
        setEstadoFilter(newEstado);
        fetchUsuarios(searchTerm, newEstado, rolFilter);
    };

    const handleRolChange = (e) => {
        const newRol = e.target.value;
        setRolFilter(newRol);
        fetchUsuarios(searchTerm, estadoFilter, newRol);
    };

    const openDeleteModal = (usuario) => {
        setUserToDelete(usuario);
        setModalOpen(true);
    };

    const closeDeleteModal = () => {
        setUserToDelete(null);
        setModalOpen(false);
    };

    const handleDelete = async () => {
        if (!userToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/coordinacion/usuarios/${userToDelete.id_usuario}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.status === 'ok') {
                setSuccessMessage('Usuario eliminado exitosamente.');
                setUsuarios(usuarios.filter(u => u.id_usuario !== userToDelete.id_usuario));
                closeDeleteModal();

                setTimeout(() => {
                    if (messageRef.current) {
                        messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);

                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                alert(data.message || 'Error al eliminar usuario');
            }
        } catch (err) {
            alert('Error de conexión al eliminar usuario');
        }
    };

    return (
        <DashboardLayout title="Control de Salida | Registro de Usuario">
            <div className="min-h-screen bg-gray-50 p-8 pt-24"> {/* pt-24 para compensar header fijo */}
                <div className="max-w-7xl mx-auto">

                    {/* Título separado */}
                    <div className="mb-6">
                        <h2 className="text-3xl font-bold text-[#39A900]">
                            <i className="fas fa-users mr-2"></i> Listado y Búsqueda de Usuarios
                        </h2>
                    </div>

                    {/* Barra de filtros y acciones */}
                    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                        <div className="flex flex-col lg:flex-row gap-4 items-end">
                            {/* Filtros de búsqueda */}
                            <div className="flex flex-col md:flex-row gap-3 flex-1">
                                {/* Input de búsqueda */}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nombre o N° Documento..."
                                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900]"
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
                                        <button type="submit" className="bg-[#39A900] text-white px-4 py-2 rounded-lg hover:bg-[#2A7D00] transition">
                                            <i className="fas fa-search"></i>
                                        </button>
                                    </form>
                                </div>

                                {/* Select de Estado */}
                                <div className="w-full md:w-48">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <select
                                        value={estadoFilter}
                                        onChange={handleEstadoChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900]"
                                    >
                                        <option value="">Todos</option>
                                        <option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>

                                {/* Select de Rol */}
                                <div className="w-full md:w-48">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <select
                                        value={rolFilter}
                                        onChange={handleRolChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900]"
                                    >
                                        <option value="">Todos</option>
                                        {roles.map(rol => (
                                            <option key={rol.id_rol} value={rol.id_rol}>
                                                {rol.nombre_rol}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-2">
                                <Link
                                    to="/coordinacion/inicio"
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition flex items-center"
                                >
                                    <i className="fas fa-arrow-left mr-2"></i>
                                    Volver
                                </Link>

                                <Link
                                    to="/coordinacion/registrarusuario"
                                    className="bg-[#39A900] text-white px-4 py-2 rounded-lg hover:bg-[#2A7D00] transition flex items-center"
                                >
                                    <i className="fas fa-user-plus mr-2"></i>
                                    Nuevo Usuario
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Mensajes de Estado */}
                    {successMessage && (
                        <div ref={messageRef} className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm scroll-mt-24">
                            <p className="font-bold"><i className="fas fa-check-circle mr-2"></i> Éxito</p>
                            <p>{successMessage}</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
                            <p className="font-bold"><i className="fas fa-exclamation-circle mr-2"></i> Error</p>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Tabla de Resultados */}
                    {loading ? (
                        <div className="text-center py-10">
                            <i className="fas fa-spinner fa-spin text-4xl text-green-600"></i>
                            <p className="mt-2 text-gray-600">Cargando usuarios...</p>
                        </div>
                    ) : usuarios.length > 0 ? (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-green-50 text-green-700 uppercase text-sm font-bold">
                                        <tr>
                                            <th className="p-4 border-b">Nombre Completo</th>
                                            <th className="p-4 border-b">Documento</th>
                                            <th className="p-4 border-b">Correo</th>
                                            <th className="p-4 border-b">Rol</th>
                                            <th className="p-4 border-b">Estado</th>
                                            <th className="p-4 border-b text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-700">
                                        {usuarios.map((usuario) => (
                                            <tr key={usuario.id_usuario} className="hover:bg-gray-50 border-b last:border-b-0 transition">
                                                <td className="p-4">{usuario.nombre} {usuario.apellido}</td>
                                                <td className="p-4">{usuario.tipo_documento} {usuario.documento}</td>
                                                <td className="p-4">{usuario.correo}</td>
                                                <td className="p-4">{usuario.nombre_rol || 'Sin Rol'}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${usuario.estado.toLowerCase() === 'activo'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {usuario.estado}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <Link
                                                            to={`/coordinacion/editarusuario/${usuario.id_usuario}`}
                                                            className="group relative w-10 h-10 rounded-[14px] bg-[rgb(93,93,116)] flex items-center justify-center shadow-[0px_3px_8px_rgba(0,0,0,0.123)] cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-[0px_3px_8px_rgba(0,0,0,0.336)]"
                                                            title="Editar"
                                                        >
                                                            {/* Circular blur background effect */}
                                                            <span className="absolute w-[200%] h-[200%] bg-[rgb(102,102,141)] rounded-full scale-0 transition-transform duration-300 blur-[10px] group-hover:scale-100 z-[1]"></span>

                                                            {/* Edit icon SVG */}
                                                            <svg
                                                                className="h-[12px] fill-white z-[3] transition-all duration-200 origin-bottom group-hover:rotate-[-15deg] group-hover:translate-x-[3px]"
                                                                viewBox="0 0 512 512"
                                                            >
                                                                <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
                                                            </svg>

                                                            {/* Animated underline */}
                                                            <span className="absolute w-[18px] h-[1.5px] bottom-[14px] -left-[4px] bg-white rounded-[2px] z-[2] scale-x-0 origin-left transition-transform duration-500 ease-out group-hover:scale-x-100 group-hover:left-0 group-hover:origin-right"></span>
                                                        </Link>
                                                        <button
                                                            onClick={() => openDeleteModal(usuario)}
                                                            className="bg-white text-red-500 hover:text-red-600 transition"
                                                            title="Eliminar"
                                                        >
                                                            <i className="fas fa-trash-alt text-lg"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-xl shadow border border-gray-200">
                            <p className="text-xl text-gray-500 mb-4">No se encontraron usuarios.</p>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setEstadoFilter('');
                                    setRolFilter('');
                                    fetchUsuarios('', '', '');
                                }}
                                className="text-green-600 hover:underline font-semibold"
                            >
                                <i className="fas fa-sync mr-2"></i> Mostrar todos
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal de Eliminación */}
                {modalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-fade-in-up">
                            <i className="fas fa-exclamation-triangle text-5xl text-yellow-400 mb-4"></i>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmar Eliminación</h3>
                            <p className="text-gray-600 mb-6">
                                ¿Está seguro de que desea eliminar al usuario <strong>{userToDelete?.nombre} {userToDelete?.apellido}</strong>?
                                <br />Esta acción es irreversible.
                            </p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={closeDeleteModal}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                                >
                                    <i className="fas fa-trash-alt mr-2"></i> Sí, Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
