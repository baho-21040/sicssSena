import React, { useState, useEffect } from 'react';
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
    // Estados para listas expandibles
    const [expandedSection, setExpandedSection] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [programsList, setProgramsList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
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
                    url += 'rol=1'; // ID del rol Aprendiz
                    break;
                case 'aprendices':
                    url += 'rol=2'; // ID del rol Instructor
                    break;
                case 'instructores':
                    url += 'rol=3'; // ID del rol Coordinación
                    break;
                case 'coordinadores':
                    url += 'rol=4'; // ID del rol Vigilante
                    break;
                case 'vigilantes':
                    url += 'rol=5'; // ID del rol Administrador
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
            <main className="p-5 bg-[#f7f9fb] min-h-screen">
                {/* Grid de Tarjetas de Acción */}
                <section className="flex justify-around flex-wrap mb-10 gap-2.5">
                    {/* TARJETA 1: Crear Nuevo Usuario */}
                    <Link
                        to="/registrarusuario"
                        className="rounded-[40px] w-[22%] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-gradient-to-br from-white via-white to-[#e8f5e9] border-l-[5px] border-l-[#39A900] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#2A7D00]"
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
                        className="rounded-[40px] w-[22%] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]"
                    >
                        <div className="flex items-center w-full">
                            <div className="text-[2.5em] mr-5 min-w-[50px] text-center text-[#007bff]">
                                <i className="fas fa-search"></i>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-bold text-[#2A7D00]">Gestión y Búsqueda Avanzada</h3>
                                <p className="mt-1 mb-0 text-[0.85em] text-[#777]">Buscar, editar, actualizar o eliminar cuentas existentes.</p>
                            </div>
                        </div>
                    </Link>
                    {/* TARJETA 3: Control de Acceso (Status) */}
                    <Link
                        to="/estado"
                        className="rounded-[40px] w-[22%] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]"
                    >
                        <div className="flex items-center w-full">
                            <div className="text-[2.5em] mr-5 min-w-[50px] text-center text-[#ffc107]">
                                <i className="fas fa-toggle-off"></i>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-bold text-[#2A7D00]">Control de Acceso (Status)</h3>
                                <p className="mt-1 mb-0 text-[0.85em] text-[#777]">Activar o desactivar temporalmente el acceso al sistema.</p>
                            </div>
                        </div>
                    </Link>
                    {/* TARJETA 4: Control de Programas de Formación */}
                    <Link
                        to="/Programas"
                        className="rounded-[40px] w-[22%] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]"
                    >
                        <div className="flex items-center w-full">
                            <div className="text-[2.5em] mr-5 min-w-[50px] text-center text-[#17a2b8]">
                                <i className="fas fa-list-check"></i>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-bold text-[#2A7D00]">Control de Programas de Formación</h3>
                                <p className="mt-1 mb-0 text-[0.85em] text-[#777]">Consulta y controla los programas.</p>
                            </div>
                        </div>
                    </Link>
                </section>
                {/* CONTENEDOR 1: Estadísticas de Usuarios */}
                <section className="w-full bg-white rounded-[20px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] p-6 mb-8 border-t-4 border-t-[#39A900]">
                    <h3 className="text-[1.3em] font-bold text-[#2A7D00] mb-5 flex items-center gap-2.5">
                        <i className="fas fa-users text-[#39A900] text-[1.2em]"></i>
                        Estadísticas de Usuarios
                    </h3>
                    <div className="flex justify-around">
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('total')}
                        >
                            <i className="fas fa-users text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.totalUsers}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Usuarios Totales</span>
                        </div>
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('activos')}
                        >
                            <i className="fas fa-user-check text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.activeUsers}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Usuarios Activos</span>
                        </div>
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('inactivos')}
                        >
                            <i className="fas fa-user-slash text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.inactiveUsers}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Usuarios Desactivados</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-clock text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#ffc107]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.totalRequests}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Solicitudes Generadas</span>
                        </div>
                    </div>
                    {/* Lista expandible de usuarios */}
                    {(expandedSection === 'total' || expandedSection === 'activos' || expandedSection === 'inactivos') && (
                        <div className="mt-4 border-t pt-4">
                            {usersLoading ? (
                                <div className="text-center py-4">
                                    <i className="fas fa-spinner fa-spin text-2xl text-[#39A900]"></i>
                                </div>
                            ) : (
                                <>
                                    {/* Campo de búsqueda */}
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre o documento..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39A900]"
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
                </section>
                {/* CONTENEDOR 2: Estadísticas por Rol */}
                <section className="w-full bg-white rounded-[20px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] p-6 mb-8 border-t-4 border-t-[#39A900]">
                    <h3 className="text-[1.3em] font-bold text-[#2A7D00] mb-5 flex items-center gap-2.5">
                        <i className="fas fa-user-tag text-[#39A900] text-[1.2em]"></i>
                        Estadísticas por Rol
                    </h3>
                    <div className="flex justify-around">
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('aprendices')}
                        >
                            <i className="fas fa-user-graduate text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.apprenticesCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Aprendices</span>
                        </div>
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('instructores')}
                        >
                            <i className="fa-solid fa-person-chalkboard text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.instructorsCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Instructores</span>
                        </div>
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('coordinadores')}
                        >
                            <i className="fas fa-user-tie text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.coordinadoresCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Coordinadores</span>
                        </div>
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('vigilantes')}
                        >
                            <i className="fas fa-user-shield text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.vigilantesCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Vigilantes</span>
                        </div>
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('administradores')}
                        >
                            <i className="fa-solid fa-user-gear text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.administradoresCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Administradores</span>
                        </div>
                    </div>
                    {/* Lista expandible de usuarios por rol */}
                    {(expandedSection === 'aprendices' || expandedSection === 'instructores' || expandedSection === 'coordinadores' || expandedSection === 'vigilantes' || expandedSection === 'administradores') && (
                        <div className="mt-4 border-t pt-4">
                            {usersLoading ? (
                                <div className="text-center py-4">
                                    <i className="fas fa-spinner fa-spin text-2xl text-[#39A900]"></i>
                                </div>
                            ) : (
                                <>
                                    {/* Campo de búsqueda */}
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre o documento..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39A900]"
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
                </section>
                {/* CONTENEDOR 3: Estadísticas de Programas */}
                <section data-aos="fade-up" className="w-full bg-white rounded-[20px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] p-6 mb-8 border-t-4 border-t-[#39A900]">
                    <h3 className="text-[1.3em] font-bold text-[#2A7D00] mb-5 flex items-center gap-2.5">
                        <i className="fas fa-graduation-cap text-[#39A900] text-[1.2em]"></i>
                        Estadísticas de Programas de Formación
                    </h3>
                    <div className="flex justify-around">
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('totalPrograms')}
                        >
                            <i className="fas fa-book text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.totalPrograms}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Programas Totales</span>
                        </div>
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('programasActivos')}
                        >
                            <i className="fas fa-check-circle text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.programasActivos}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Programas Activos</span>
                        </div>
                        <div
                            className="text-center border-r border-r-[#eee] px-6 last:border-r-0 cursor-pointer hover:bg-gray-50 py-3 rounded-lg transition"
                            onClick={() => toggleSection('programasInactivos')}
                        >
                            <i className="fas fa-ban text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.programasInactivos}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Programas Inactivos</span>
                        </div>
                    </div>
                    {/* Lista expandible de programas */}
                    {(expandedSection === 'totalPrograms' || expandedSection === 'programasActivos' || expandedSection === 'programasInactivos') && (
                        <div className="mt-4 border-t pt-4">
                            {usersLoading ? (
                                <div className="text-center py-4">
                                    <i className="fas fa-spinner fa-spin text-2xl text-[#39A900]"></i>
                                </div>
                            ) : (
                                <>
                                    {/* Campo de búsqueda */}
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre de programa o número de ficha..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39A900]"
                                        />
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-100 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold">Programa</th>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold">Ficha</th>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold">Nivel</th>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold">Jornada</th>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredPrograms.map((programa, index) => (
                                                    <tr key={programa.id_programa} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="px-4 py-2 text-sm">{programa.nombre_programa}</td>
                                                        <td className="px-4 py-2 text-sm">{programa.numero_ficha}</td>
                                                        <td className="px-4 py-2 text-sm">{programa.nivel}</td>
                                                        <td className="px-4 py-2 text-sm">{programa.nombre_jornada}</td>
                                                        <td className="px-4 py-2 text-sm">
                                                            <span className={`px-2 py-1 rounded text-xs ${programa.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {programa.estado}
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
                </section>
            </main>
        </DashboardLayout>
    );
};
export default InicioAdmin;