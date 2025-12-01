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
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-users text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.totalUsers}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Usuarios Totales</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-user-check text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.activeUsers}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Usuarios Activos</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
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
                </section>

                {/* CONTENEDOR 2: Estadísticas por Rol */}
                <section className="w-full bg-white rounded-[20px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] p-6 mb-8 border-t-4 border-t-[#39A900]">
                    <h3 className="text-[1.3em] font-bold text-[#2A7D00] mb-5 flex items-center gap-2.5">
                        <i className="fas fa-user-tag text-[#39A900] text-[1.2em]"></i>
                        Estadísticas por Rol
                    </h3>
                    <div className="flex justify-around">
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-user-graduate text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.apprenticesCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Aprendices</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fa-solid fa-person-chalkboard text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.instructorsCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Instructores</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-user-tie text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.coordinadoresCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Coordinadores</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-user-shield text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.vigilantesCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Vigilantes</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fa-solid fa-user-gear text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.administradoresCount}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Administradores</span>
                        </div>
                    </div>
                </section>

                {/* CONTENEDOR 3: Estadísticas de Programas */}
                <section data-aos="fade-up" className="w-full bg-white rounded-[20px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] p-6 mb-8 border-t-4 border-t-[#39A900]">
                    <h3 className="text-[1.3em] font-bold text-[#2A7D00] mb-5 flex items-center gap-2.5">
                        <i className="fas fa-graduation-cap text-[#39A900] text-[1.2em]"></i>
                        Estadísticas de Programas de Formación
                    </h3>
                    <div className="flex justify-around">
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-book text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.totalPrograms}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Programas Totales</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-check-circle text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.programasActivos}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Programas Activos</span>
                        </div>
                        <div className="text-center border-r border-r-[#eee] px-6 last:border-r-0">
                            <i className="fas fa-ban text-[1.8em] text-[#39A900] mb-1.5"></i>
                            <span className="block text-[2em] font-bold text-[#2A7D00]">
                                {loading ? <i className="fas fa-spinner fa-spin text-sm"></i> : stats.programasInactivos}
                            </span>
                            <span className="block text-[0.9em] text-[#777] -mt-1.5">Programas Inactivos</span>
                        </div>
                    </div>
                </section>
            </main>
        </DashboardLayout>
    );
};

export default InicioAdmin;