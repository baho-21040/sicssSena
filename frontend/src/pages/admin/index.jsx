import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';
import { API_BASE_URL } from '../../config/api.js';

const InicioAdmin = () => {
    const { user } = useUser();
    const [stats, setStats] = useState({
        activeUsers: 0,
        activePrograms: 0,
        totalRequests: 0,
        apprenticesCount: 0,
        instructorsCount: 0,
        inactiveUsers: 0,
        programasActivos: 0,
        programasInactivos: 0,
        totalUsers: 0,
        totalPrograms: 0,
        coordinadoresCount: 0,
        vigilantesCount: 0,
        administradoresCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);

    // Estados para listas expandibles
    const [expandedSection, setExpandedSection] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [programsList, setProgramsList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const expandedSectionRef = useRef(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                // Verificar que la respuesta sea JSON antes de parsear
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.error('Error: La respuesta del servidor no es JSON');
                    return;
                }

                const data = await response.json();
                if (data.status === 'ok') {
                    setStats(data.stats);
                }
            } catch (error) {
                console.error('Error al cargar estadísticas:', error);
            } finally {
                setLoading(false);
                setStatsLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Función para obtener lista de usuarios por categoría
    const fetchUsersByCategory = async (category) => {
        setUsersLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/api/usuarios?`;
            // Determinar el filtro según la categoría
            switch (category) {
                case 'total':
                    // Sin filtro, traer todos
                    break;
                case 'activos':
                    url += 'estado=Activo';
                    break;
                case 'inactivos':
                    url += 'estado=Inactivo';
                    break;
                case 'administradores':
                    url += 'rol=1';
                    break;
                case 'aprendices':
                    url += 'rol=2';
                    break;
                case 'instructores':
                    url += 'rol=3';
                    break;
                case 'coordinadores':
                    url += 'rol=4';
                    break;
                case 'vigilantes':
                    url += 'rol=5';
                    break;
            }
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.status === 'ok') {
                setUsersList(data.usuarios);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        } finally {
            setUsersLoading(false);
        }
    };

    // Función para obtener lista de programas
    const fetchProgramsByCategory = async (category) => {
        setUsersLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/programas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.status === 'ok') {
                let filteredPrograms = data.programas;

                // Filtrar según categoría
                if (category === 'programasActivos') {
                    filteredPrograms = data.programas.filter(p => p.estado === 'Activo');
                } else if (category === 'programasInactivos') {
                    filteredPrograms = data.programas.filter(p => p.estado === 'Inactivo');
                }

                setProgramsList(filteredPrograms);
            }
        } catch (error) {
            console.error('Error al cargar programas:', error);
        } finally {
            setUsersLoading(false);
        }
    };

    // Función para alternar la expansión de una sección
    const toggleSection = (section) => {
        if (expandedSection === section) {
            // Si ya está expandida, cerrarla
            setExpandedSection(null);
            setUsersList([]);
            setProgramsList([]);
            setSearchTerm('');
        } else {
            // Expandir nueva sección
            setExpandedSection(section);
            setSearchTerm('');
            // Determinar si es usuario o programa
            if (section === 'totalPrograms' || section === 'programasActivos' || section === 'programasInactivos') {
                fetchProgramsByCategory(section);
            } else {
                fetchUsersByCategory(section);
            }

            // Scroll to expanded section after a short delay
            setTimeout(() => {
                if (expandedSectionRef.current) {
                    expandedSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
        }
    };

    // Filtrar usuarios según término de búsqueda
    const filteredUsers = usersList.filter(usuario => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${usuario.nombre} ${usuario.apellido}`.toLowerCase();
        const documento = usuario.documento.toString();
        return fullName.includes(searchLower) || documento.includes(searchTerm);
    });

    // Filtrar programas según término de búsqueda
    const filteredPrograms = programsList.filter(programa => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const nombrePrograma = programa.nombre_programa.toLowerCase();
        const numeroFicha = programa.numero_ficha.toString();
        return nombrePrograma.includes(searchLower) || numeroFicha.includes(searchTerm);
    });

    return (
        <DashboardLayout>
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
                {/* Grid de Tarjetas de Acción (Estilo Coordinación) */}
                <section className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 gap-4 mb-10">
                    {/* TARJETA 1: Crear Nuevo Usuario */}
                    <Link
                        to="/registrarusuario"
                        className="rounded-[60px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-gradient-to-br from-white via-white to-[#e8f5e9] border-l-[5px] border-l-[#39A900] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#2A7D00]"
                    >
                        <div className="flex items-center w-full">
                            <div className="text-[2.5em] mr-5 min-w-[50px] text-center text-[#39A900]">
                                <i className="fas fa-user-plus"></i>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-bold text-[#2A7D00]">Crear Nuevo Usuario</h3>
                                <p className="mt-1 mb-0 text-[0.85em] text-[#777]">Registro rápido de Usuario con su rol asignado.</p>
                            </div>
                        </div>
                    </Link>

                    {/* TARJETA 2: Buscar Usuario */}
                    <Link
                        to="/buscarusuario"
                        className="rounded-[60px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]"
                    >
                        <div className="flex items-center w-full">
                            <div className="text-[2.5em] mr-5 min-w-[50px] text-center text-[#007bff]">
                                <i className="fas fa-search"></i>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-bold text-[#2A7D00]">Gestión y Búsqueda</h3>
                                <p className="mt-1 mb-0 text-[0.85em] text-[#777]">Buscar, editar, actualizar o eliminar cuentas existentes.</p>
                            </div>
                        </div>
                    </Link>

                    {/* TARJETA 3: Control de Acceso (Status) */}
                    <Link
                        to="/estado"
                        className="rounded-[60px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]"
                    >
                        <div className="flex items-center w-full">
                            <div className="text-[2.5em] mr-5 min-w-[50px] text-center text-[#ffc107]">
                                <i className="fas fa-toggle-off"></i>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-bold text-[#2A7D00]">Control de Acceso</h3>
                                <p className="mt-1 mb-0 text-[0.85em] text-[#777]">Activar o desactivar temporalmente el acceso al sistema.</p>
                            </div>
                        </div>
                    </Link>

                    {/* TARJETA 4: Control de Programas de Formación */}
                    <Link
                        to="/Programas"
                        className="rounded-[60px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]"
                    >
                        <div className="flex items-center w-full">
                            <div className="text-[2.5em] mr-5 min-w-[50px] text-center text-[#17a2b8]">
                                <i className="fas fa-list-check"></i>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-bold text-[#2A7D00]">Programas de Formación</h3>
                                <p className="mt-1 mb-0 text-[0.85em] text-[#777]">Consulta y controla los programas.</p>
                            </div>
                        </div>
                    </Link>
                </section>

                <div className="grid grid-cols-1 gap-4">
                    {/* Estadísticas de Usuarios */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-t-indigo-600">
                        <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-users text-indigo-600"></i>
                            Estadísticas de Usuarios
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div
                                className={`text-center cursor-pointer hover:bg-gray-100 p-3 rounded-lg transition ${expandedSection === 'total' ? 'border-4 border-indigo-600 bg-indigo-50' : ''}`}
                                onClick={() => toggleSection('total')}
                            >
                                <i className="fas fa-users text-3xl text-indigo-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.totalUsers}
                                </span>
                                <span className="block text-sm text-gray-600">Usuarios Totales</span>
                            </div>
                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'activos' ? 'border-4 border-green-600 bg-green-50' : ''}`}
                                onClick={() => toggleSection('activos')}
                            >
                                <i className="fas fa-user-check text-3xl text-green-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.activeUsers}
                                </span>
                                <span className="block text-sm text-gray-600">Usuarios Activos</span>
                            </div>

                            {/* Expandible section for mobile - appears after first row */}
                            {(expandedSection === 'total' || expandedSection === 'activos') && (
                                <div className="col-span-2 md:hidden animate-[fadeIn_0.3s_ease-out]" ref={expandedSectionRef}>
                                    <div className="border-t pt-4">
                                        {usersLoading ? (
                                            <div className="text-center py-4">
                                                <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre o documento..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                                    />
                                                </div>
                                                <div className="max-h-96 overflow-y-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Rol</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre_rol}</td>
                                                                    <td className="px-4 py-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {usuario.estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <button
                                                    onClick={() => toggleSection(null)}
                                                    className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                                >
                                                    Ocultar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'inactivos' ? 'border-4 border-red-600 bg-red-50' : ''}`}
                                onClick={() => toggleSection('inactivos')}
                            >
                                <i className="fas fa-user-slash text-3xl text-red-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.inactiveUsers}
                                </span>
                                <span className="block text-sm text-gray-600">Usuarios Desactivados</span>
                            </div>
                            <div className="text-center ">
                                <i className="fas fa-clock text-3xl text-yellow-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.totalRequests}
                                </span>
                                <span className="block text-sm text-gray-600">Solicitudes Generadas</span>
                            </div>

                            {/* Expandible section for mobile - appears after second row */}
                            {expandedSection === 'inactivos' && (
                                <div className="col-span-2 md:hidden animate-[fadeIn_0.3s_ease-out]" ref={expandedSectionRef}>
                                    <div className="border-t pt-4">
                                        {usersLoading ? (
                                            <div className="text-center py-4">
                                                <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre o documento..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                                    />
                                                </div>
                                                <div className="max-h-96 overflow-y-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Rol</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre_rol}</td>
                                                                    <td className="px-4 py-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {usuario.estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <button
                                                    onClick={() => toggleSection(null)}
                                                    className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                                >
                                                    Ocultar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lista expandible de usuarios - shown on desktop */}
                        {(expandedSection === 'total' || expandedSection === 'activos' || expandedSection === 'inactivos') && (
                            <div className="mt-4 border-t pt-4 hidden md:block" ref={expandedSectionRef}>
                                {usersLoading ? (
                                    <div className="text-center py-4">
                                        <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4">
                                            <input
                                                type="text"
                                                placeholder="Buscar por nombre o documento..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                            />
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-100 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Rol</th>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredUsers.map((usuario, index) => (
                                                        <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                            <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                            <td className="px-4 py-2 text-sm">{usuario.nombre_rol}</td>
                                                            <td className="px-4 py-2 text-sm">
                                                                <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {usuario.estado}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <button
                                            onClick={() => toggleSection(null)}
                                            className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                        >
                                            Ocultar
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Estadísticas por Rol */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-t-purple-600">
                        <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-user-tag text-purple-600"></i>
                            Estadísticas por Rol
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'aprendices' ? 'border-4 border-blue-600 bg-blue-50' : ''}`}
                                onClick={() => toggleSection('aprendices')}
                            >
                                <i className="fas fa-user-graduate text-3xl text-blue-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.apprenticesCount}
                                </span>
                                <span className="block text-sm text-gray-600">Aprendices</span>
                            </div>
                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'instructores' ? 'border-4 border-green-600 bg-green-50' : ''}`}
                                onClick={() => toggleSection('instructores')}
                            >
                                <i className="fa-solid fa-person-chalkboard text-3xl text-green-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.instructorsCount}
                                </span>
                                <span className="block text-sm text-gray-600">Instructores</span>
                            </div>

                            {/* Expandible section for mobile - appears after first row */}
                            {(expandedSection === 'aprendices' || expandedSection === 'instructores') && (
                                <div className="col-span-2 md:hidden animate-[fadeIn_0.3s_ease-out]" ref={expandedSectionRef}>
                                    <div className="border-t pt-4">
                                        {usersLoading ? (
                                            <div className="text-center py-4">
                                                <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre o documento..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                                    />
                                                </div>
                                                <div className="max-h-96 overflow-y-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Correo</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.correo}</td>
                                                                    <td className="px-4 py-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {usuario.estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <button
                                                    onClick={() => toggleSection(null)}
                                                    className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                                >
                                                    Ocultar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'coordinadores' ? 'border-4 border-purple-600 bg-purple-50' : ''}`}
                                onClick={() => toggleSection('coordinadores')}
                            >
                                <i className="fas fa-user-tie text-3xl text-purple-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.coordinadoresCount}
                                </span>
                                <span className="block text-sm text-gray-600">Coordinadores</span>
                            </div>
                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'vigilantes' ? 'border-4 border-orange-600 bg-orange-50' : ''}`}
                                onClick={() => toggleSection('vigilantes')}
                            >
                                <i className="fas fa-user-shield text-3xl text-orange-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.vigilantesCount}
                                </span>
                                <span className="block text-sm text-gray-600">Vigilantes</span>
                            </div>

                            {/* Expandible section for mobile - appears after second row */}
                            {(expandedSection === 'coordinadores' || expandedSection === 'vigilantes') && (
                                <div className="col-span-2 md:hidden animate-[fadeIn_0.3s_ease-out]" ref={expandedSectionRef}>
                                    <div className="border-t pt-4">
                                        {usersLoading ? (
                                            <div className="text-center py-4">
                                                <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre o documento..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                                    />
                                                </div>
                                                <div className="max-h-96 overflow-y-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Correo</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.correo}</td>
                                                                    <td className="px-4 py-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {usuario.estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <button
                                                    onClick={() => toggleSection(null)}
                                                    className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                                >
                                                    Ocultar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'administradores' ? 'border-4 border-gray-600 bg-gray-50' : ''}`}
                                onClick={() => toggleSection('administradores')}
                            >
                                <i className="fa-solid fa-user-gear text-3xl text-gray-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.administradoresCount}
                                </span>
                                <span className="block text-sm text-gray-600">Administradores</span>
                            </div>

                            {/* Expandible section for mobile - appears after third row */}
                            {expandedSection === 'administradores' && (
                                <div className="col-span-2 md:hidden animate-[fadeIn_0.3s_ease-out]" ref={expandedSectionRef}>
                                    <div className="border-t pt-4">
                                        {usersLoading ? (
                                            <div className="text-center py-4">
                                                <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre o documento..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                                    />
                                                </div>
                                                <div className="max-h-96 overflow-y-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Correo</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.correo}</td>
                                                                    <td className="px-4 py-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {usuario.estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <button
                                                    onClick={() => toggleSection(null)}
                                                    className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                                >
                                                    Ocultar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lista expandible de Roles - Desktop */}
                        {(expandedSection === 'aprendices' || expandedSection === 'instructores' || expandedSection === 'coordinadores' || expandedSection === 'vigilantes' || expandedSection === 'administradores') && (
                            <div className="col-span-full mt-4 border-t pt-4 hidden md:block" ref={expandedSectionRef}>
                                {usersLoading ? (
                                    <div className="text-center py-4">
                                        <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4">
                                            <input
                                                type="text"
                                                placeholder="Buscar por nombre o documento..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                            />
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-100 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Correo</th>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredUsers.map((usuario, index) => (
                                                        <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                            <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                            <td className="px-4 py-2 text-sm">{usuario.correo}</td>
                                                            <td className="px-4 py-2 text-sm">
                                                                <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {usuario.estado}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <button
                                            onClick={() => toggleSection(null)}
                                            className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                        >
                                            Ocultar
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Estadísticas de Programas */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-t-teal-600">
                        <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-graduation-cap text-teal-600"></i>
                            Estadísticas de Programas
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'totalPrograms' ? 'border-4 border-teal-600 bg-teal-50' : ''}`}
                                onClick={() => toggleSection('totalPrograms')}
                            >
                                <i className="fas fa-book text-3xl text-teal-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.totalPrograms}
                                </span>
                                <span className="block text-sm text-gray-600">Programas Totales</span>
                            </div>
                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'programasActivos' ? 'border-4 border-green-600 bg-green-50' : ''}`}
                                onClick={() => toggleSection('programasActivos')}
                            >
                                <i className="fas fa-check-circle text-3xl text-green-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.programasActivos}
                                </span>
                                <span className="block text-sm text-gray-600">Activos</span>
                            </div>

                            {/* Sección desplegable Intermedia (Solo Móvil - Para Total y Activos) */}
                            {(expandedSection === 'totalPrograms' || expandedSection === 'programasActivos') && (
                                <div className="col-span-2 md:hidden animate-[fadeIn_0.3s_ease-out]" ref={expandedSectionRef}>
                                    <div className="border-t pt-4">
                                        {usersLoading ? (
                                            <div className="text-center py-4">
                                                <i className="fas fa-spinner fa-spin text-2xl text-teal-600"></i>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar programa por nombre o ficha..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                                                    />
                                                </div>
                                                <div className="max-h-96 overflow-y-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Programa</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Ficha</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredPrograms.map((programa, index) => (
                                                                <tr key={programa.id_programa} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{programa.nombre_programa}</td>
                                                                    <td className="px-4 py-2 text-sm">{programa.numero_ficha}</td>
                                                                    <td className="px-4 py-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded text-xs ${programa.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {programa.estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {filteredPrograms.length === 0 && (
                                                        <div className="text-center py-4 text-gray-500">No se encontraron programas.</div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => toggleSection(null)}
                                                    className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                                >
                                                    Ocultar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div
                                className={`text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition ${expandedSection === 'programasInactivos' ? 'border-4 border-red-600 bg-red-50' : ''}`}
                                onClick={() => toggleSection('programasInactivos')}
                            >
                                <i className="fas fa-times-circle text-3xl text-red-600 mb-2"></i>
                                <span className="block text-3xl font-bold text-gray-800">
                                    {statsLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.programasInactivos}
                                </span>
                                <span className="block text-sm text-gray-600">Inactivos</span>
                            </div>

                            {/* Sección desplegable Inferior (Desktop: Todas; Mobile: Solo Inactivos) */}
                            {((expandedSection === 'totalPrograms' || expandedSection === 'programasActivos' || expandedSection === 'programasInactivos')) && (
                                <div className={`col-span-full mt-4 border-t pt-4 animate-[fadeIn_0.3s_ease-out] ${(expandedSection === 'programasInactivos') ? 'block' : 'hidden md:block'}`} ref={expandedSectionRef}>
                                    {usersLoading ? (
                                        <div className="text-center py-4">
                                            <i className="fas fa-spinner fa-spin text-2xl text-teal-600"></i>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-4">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar programa por nombre o ficha..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                                                />
                                            </div>
                                            <div className="max-h-96 overflow-y-auto">
                                                <table className="w-full">
                                                    <thead className="bg-gray-100 sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-sm font-semibold">Programa</th>
                                                            <th className="px-4 py-2 text-left text-sm font-semibold">Ficha</th>
                                                            <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredPrograms.map((programa, index) => (
                                                            <tr key={programa.id_programa} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                <td className="px-4 py-2 text-sm">{programa.nombre_programa}</td>
                                                                <td className="px-4 py-2 text-sm">{programa.numero_ficha}</td>
                                                                <td className="px-4 py-2 text-sm">
                                                                    <span className={`px-2 py-1 rounded text-xs ${programa.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                        {programa.estado}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {filteredPrograms.length === 0 && (
                                                    <div className="text-center py-4 text-gray-500">No se encontraron programas.</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => toggleSection(null)}
                                                className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition"
                                            >
                                                Ocultar
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default InicioAdmin;