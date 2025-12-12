import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';

import { API_BASE_URL } from '../../config/api.js';

const API = API_BASE_URL;

const InicioCoordinacion = () => {
    const { user } = useUser();

    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [showSoporteModal, setShowSoporteModal] = useState(false);
    const [showAprobarModal, setShowAprobarModal] = useState(false);
    const [showRechazarModal, setShowRechazarModal] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [notification, setNotification] = useState(null);
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
    const [statsLoading, setStatsLoading] = useState(true);

    // Estados para listas expandibles
    const [expandedSection, setExpandedSection] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [programsList, setProgramsList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const expandedSectionRef = useRef(null);

    // Cargar solicitudes (sin lógica de notificación - ahora es manejada por NotificationContext)
    const cargarSolicitudes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/coordinacion/solicitudes-pendientes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            console.log('Datos recibidos en Coordinación:', data);
            if (data.status === 'ok') {
                setSolicitudes(data.solicitudes);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Polling cada 5 segundos para actualizar la tabla
    useEffect(() => {
        cargarSolicitudes();
        const interval = setInterval(cargarSolicitudes, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API}/api/admin/stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

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
            let url = `${API}/api/usuarios?`;
            switch (category) {
                case 'total': break;
                case 'activos': url += 'estado=Activo'; break;
                case 'inactivos': url += 'estado=Inactivo'; break;

                case 'administradores': url += 'rol=1'; break;
                case 'aprendices': url += 'rol=2'; break;
                case 'instructores': url += 'rol=3'; break;
                case 'coordinadores': url += 'rol=4'; break;
                case 'vigilantes': url += 'rol=5'; break;
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
            const response = await fetch(`${API}/api/programas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.status === 'ok') {
                let filteredPrograms = data.programas;

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
            setExpandedSection(null);
            setUsersList([]);
            setProgramsList([]);
            setSearchTerm('');
        } else {
            setExpandedSection(section);
            setSearchTerm('');
            if (section === 'totalPrograms' || section === 'programasActivos' || section === 'programasInactivos') {
                fetchProgramsByCategory(section);
            } else {
                fetchUsersByCategory(section);
            }
            // Scroll to expanded section after a short delay to allow rendering
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


    const getTimeAgo = (fecha) => {
        const now = new Date();
        const past = new Date(fecha);
        const diff = Math.floor((now - past) / 1000);

        if (diff < 60) return "hace un momento";
        if (diff < 120) return "hace 1 minuto";
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
        if (diff < 7200) return "hace 1 hora";
        return `hace ${Math.floor(diff / 3600)} horas`;
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

    const formatFecha = (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

    const aprobarSolicitud = async () => {
        if (!selectedSolicitud) return;
        setProcesando(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/coordinacion/aprobar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id_permiso: selectedSolicitud.id_permiso })
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setSolicitudes(prev => prev.filter(s => s.id_permiso !== selectedSolicitud.id_permiso));
                setShowAprobarModal(false);
                setShowDetallesModal(false);
                setSelectedSolicitud(null);
                setNotification({ type: 'success', message: '✅ Solicitud aprobada exitosamente y código QR generado' });
                setTimeout(() => setNotification(null), 5000);
            } else {
                setNotification({ type: 'error', message: 'Error: ' + data.message });
                setTimeout(() => setNotification(null), 5000);
            }
        } catch (error) {
            console.error('Error:', error);
            setNotification({ type: 'error', message: 'Error de conexión' });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setProcesando(false);
        }
    };

    const rechazarSolicitud = async () => {
        if (!selectedSolicitud || !motivoRechazo.trim()) {
            setNotification({ type: 'error', message: 'Por favor, especifique el motivo del rechazo' });
            setTimeout(() => setNotification(null), 5000);
            return;
        }

        setProcesando(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/coordinacion/rechazar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_permiso: selectedSolicitud.id_permiso,
                    motivo_rechazo: motivoRechazo
                })
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setSolicitudes(prev => prev.filter(s => s.id_permiso !== selectedSolicitud.id_permiso));
                setShowRechazarModal(false);
                setShowDetallesModal(false);
                setSelectedSolicitud(null);
                setMotivoRechazo('');
                setNotification({ type: 'success', message: '❌ Solicitud rechazada exitosamente' });
                setTimeout(() => setNotification(null), 5000);
            } else {
                setNotification({ type: 'error', message: 'Error: ' + data.message });
                setTimeout(() => setNotification(null), 5000);
            }
        } catch (error) {
            console.error('Error:', error);
            setNotification({ type: 'error', message: 'Error de conexión' });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setProcesando(false);
        }
    };

    return (
        <DashboardLayout title="Portal de Coordinación">
            {/* Notificación flotante */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[2000] px-6 py-4 rounded-lg shadow-2xl animate-[slideIn_0.3s_ease-out] ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    <p className="font-semibold">{notification.message}</p>
                </div>
            )}

            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
                {/* Fila superior - 4 botones de acción */}
                {/* Grid de Tarjetas de Acción */}
                <section className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 gap-4 mb-10">
                    {/* TARJETA 1: Crear Nuevo Usuario */}
                    <Link
                        to="/coordinacion/registrarusuario"
                        className="rounded-[60px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-gradient-to-br from-white via-white to-[#e8f5e9] border-l-[5px] border-l-[#39A900] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#2A7D00]" >
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
                        to="/coordinacion/busquedadeusuario"
                        className="rounded-[60px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]">
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
                        to="/coordinacion/estado"
                        className="rounded-[60px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]">
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
                        to="/coordinacion/programas"
                        className="rounded-[60px] shadow-[0_4px_10px_rgba(0,0,0,0.05)] no-underline text-[#333] transition-all duration-300 ease-in-out flex items-center p-6 bg-white border-l-[5px] border-l-[#ccc] hover:-translate-y-1.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:border-l-[#007bff]">
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

                {/* Fila media - Solicitudes pendientes + Historial + Editar perfil */}
                {/* Fila media - Solicitudes pendientes + Historial + Editar perfil */}
                <div className="grid grid-cols-2 min-[1141px]:grid-cols-10 gap-4 mb-6">
                    <div className="col-span-2 min-[1141px]:col-span-6 order-last min-[1141px]:order-first rounded-[30px] bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-600 flex items-center justify-center">

                        <div className="flex items-center justify-between gap-8 ">
                            <div >
                                <h2 className="text-lg font-bold text-gray-800 mb-2 min-[530px]:text-2xl">
                                    Solicitudes Pendientes
                                </h2>
                                <p className="text-sm text-gray-600 min-[530px]:text-lg">Gestiona las solicitudes de tus aprendices</p>
                            </div>
                            <div className=" bg-gradient-to-br from-[#39A900] to-[#2A7D00] text-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl">
                                <span className="text-3xl font-bold">{solicitudes.length}</span>
                            </div>
                        </div>
                    </div>

                    <Link to="/coordinacion/historial" className="col-span-1 min-[1141px]:col-span-2 bg-gradient-to-br from-gray-200 to-gray-300 text-gray-800 p-4 rounded-[30px] shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center">
                        <div className="text-center">
                            <i className="fas fa-history text-xl  mb-2  min-[461px]:text-3xl "></i>
                            <p className="text-xs font-semibold   min-[461px]:text-lg">Historial de salida</p>
                        </div>
                    </Link>
                    <Link to="/coordinacion/editarperfil" className="col-span-1 min-[1141px]:col-span-2 bg-gradient-to-br from-gray-200 to-gray-300 text-gray-800 p-4 rounded-[30px] shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center">
                        <div className="text-center">
                            <i className="fas fa-user-edit text-xl  mb-2  min-[461px]:text-3xl "></i>
                            <p className="text-xs font-semibold min-[461px]:text-lg">Editar mi perfil</p>
                        </div>
                    </Link>
                </div>

                {/* Área central - Solicitudes enviadas */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Solicitudes enviadas</h3>
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
                        </div>
                    ) : solicitudes.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                            <p className="text-xl text-gray-500">No hay solicitudes</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden">
                            {/* Vista Tabla Desktop/Tablet (> 740px) */}
                            <table className="hidden min-[741px]:table w-full border border-gray-400 rounded-[20px] overflow-hidden">
                                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                    <tr className="rounded-[60px]">
                                        <th className="px-6 py-4 text-left font-semibold">Aprendiz</th>
                                        <th className="px-6 py-4 text-left font-semibold">Formación</th>
                                        <th className="px-6 py-4 text-left font-semibold">Tiempo</th>
                                        <th className="px-6 py-4 text-center font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {solicitudes.map((solicitud, index) => (
                                        <tr
                                            key={solicitud.id_permiso}
                                            className={`border-b hover:bg-indigo-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}
                                                        </p>
                                                        <p className="text-xs text-gray-500">Doc: {solicitud.documento_aprendiz}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-gray-800">{solicitud.nombre_programa}</p>
                                                <p className="text-xs text-gray-500">Ficha: {solicitud.numero_ficha}</p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                                                    <i className="fas fa-clock text-gray-400"></i>
                                                    {getTimeAgo(solicitud.fecha_solicitud)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSolicitud(solicitud);
                                                        setShowDetallesModal(true);
                                                    }}
                                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
                                                >
                                                    <i className="fas fa-eye mr-2"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Vista Tarjetas Mobile (<= 740px) */}
                            <div className="block min-[741px]:hidden space-y-4">
                                {solicitudes.map((solicitud) => (
                                    <div
                                        key={solicitud.id_permiso}
                                        onClick={() => {
                                            setSelectedSolicitud(solicitud);
                                            setShowDetallesModal(true);
                                        }}
                                        className="bg-white p-4 rounded-xl shadow-md border-l-4 border-indigo-600 cursor-pointer hover:shadow-lg transition-all active:scale-98"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-sm">{solicitud.nombre_aprendiz} {solicitud.apellido_aprendiz}</h3>
                                                <p className="text-xs text-gray-500">Doc: {solicitud.documento_aprendiz}</p>
                                            </div>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                                                <i className="fas fa-clock mr-1 text-indigo-500"></i>
                                                {getTimeAgo(solicitud.fecha_solicitud)}
                                            </span>
                                        </div>

                                        <div className="mb-3">
                                            <p className="text-xs font-semibold text-indigo-700">{solicitud.nombre_programa}</p>
                                            <p className="text-[12px] text-gray-600">Ficha: {solicitud.numero_ficha}</p>
                                        </div>

                                        <div className="flex justify-end items-center border-t pt-2">
                                            <span className="text-indigo-600 text-xs font-bold flex items-center gap-1">
                                                Ver detalles <i className="fas fa-arrow-right"></i>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Fila inferior - 3 bloques de estadísticas */}
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
                                <div className="col-span-2 md:hidden" ref={expandedSectionRef}>
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
                                                    {/* Vista Tabla Desktop/Tablet (> 540px) */}
                                                    <table className="w-full hidden min-[541px]:table">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {usuario.estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {/* Vista Tarjetas Mobile (<= 540px) */}
                                                    <div className="block min-[541px]:hidden space-y-3">
                                                        {filteredUsers.map((usuario) => (
                                                            <div key={usuario.id_usuario} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h5 className="font-bold text-gray-800">{usuario.nombre} {usuario.apellido}</h5>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {usuario.estado}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500">
                                                                    <span className="font-medium text-gray-700">Doc:</span> {usuario.documento}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
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
                                <div className="col-span-2 md:hidden" ref={expandedSectionRef}>
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
                                                    {/* Vista Tabla Desktop/Tablet (> 540px) */}
                                                    <table className="w-full hidden min-[541px]:table">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded text-xs ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {usuario.estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {/* Vista Tarjetas Mobile (<= 540px) */}
                                                    <div className="block min-[541px]:hidden space-y-3">
                                                        {filteredUsers.map((usuario) => (
                                                            <div key={usuario.id_usuario} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h1 className="font-bold text-gray-800 ">{usuario.nombre} {usuario.apellido}</h1>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {usuario.estado}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500">
                                                                    <span className="font-medium text-gray-700">Doc:</span> {usuario.documento}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
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
                                        {/* Campo de búsqueda */}
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
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredUsers.map((usuario, index) => (
                                                        <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                            <td className="px-4 py-2 text-sm">{usuario.documento}</td>
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
                                <div className="col-span-2 md:hidden" ref={expandedSectionRef}>
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
                                                    {/* Vista Tabla Desktop/Tablet (> 540px) */}
                                                    <table className="w-full hidden min-[541px]:table">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Correo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.correo}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {/* Vista Tarjetas Mobile (<= 540px) */}
                                                    <div className="block min-[541px]:hidden space-y-3">
                                                        {filteredUsers.map((usuario) => (
                                                            <div key={usuario.id_usuario} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                                <div className="mb-2">
                                                                    <h5 className="font-bold text-gray-800 text-[10px]">{usuario.nombre} {usuario.apellido}</h5>
                                                                    <p className="text-xs text-gray-500 text-[10px]">{usuario.documento}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                                                                    <i className="fas fa-envelope"></i>
                                                                    <span className="truncate">{usuario.correo}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
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
                                <div className="col-span-2 md:hidden" ref={expandedSectionRef}>
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
                                                    {/* Vista Tabla Desktop/Tablet (> 540px) */}
                                                    <table className="w-full hidden min-[541px]:table">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Correo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.correo}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>

                                                    </table>
                                                    {/* Vista Tarjetas Mobile (<= 540px) */}
                                                    <div className="block min-[541px]:hidden space-y-3">
                                                        {filteredUsers.map((usuario) => (
                                                            <div key={usuario.id_usuario} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                                <div className="mb-2">
                                                                    <h5 className="font-bold text-gray-800 text-[10px]">{usuario.nombre} {usuario.apellido}</h5>
                                                                    <p className="text-xs text-gray-500 text-[10px]">{usuario.documento}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                                                                    <i className="fas fa-envelope"></i>
                                                                    <span className="truncate">{usuario.correo}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

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
                                <div className="col-span-2 md:hidden" ref={expandedSectionRef}>
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
                                                    {/* Vista Tabla Desktop/Tablet (> 540px) */}
                                                    <table className="w-full hidden min-[541px]:table">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Documento</th>
                                                                <th className="px-4 py-2 text-left text-sm font-semibold">Correo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredUsers.map((usuario, index) => (
                                                                <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                                    <td className="px-4 py-2 text-sm">{usuario.correo}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {/* Vista Tarjetas Mobile (<= 540px) */}
                                                    <div className="block min-[541px]:hidden space-y-3">
                                                        {filteredUsers.map((usuario) => (
                                                            <div key={usuario.id_usuario} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                                <div className="mb-2">
                                                                    <h5 className="font-bold text-gray-800 text-[10px]">{usuario.nombre} {usuario.apellido}</h5>
                                                                    <p className="text-xs text-gray-500 text-[10px]">{usuario.documento}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                                                                    <i className="fas fa-envelope"></i>
                                                                    <span className="truncate">{usuario.correo}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
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
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredUsers.map((usuario, index) => (
                                                        <tr key={usuario.id_usuario} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-4 py-2 text-sm">{usuario.nombre} {usuario.apellido}</td>
                                                            <td className="px-4 py-2 text-sm">{usuario.documento}</td>
                                                            <td className="px-4 py-2 text-sm">{usuario.correo}</td>
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
                </div>

                {/* Estadísticas de Programas */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-t-teal-600 mt-4">
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
                                                {/* Vista Tabla Desktop/Tablet (> 540px) */}
                                                <table className="w-full hidden min-[541px]:table">
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

                                                {/* Vista Tarjetas Mobile (<= 540px) */}
                                                <div className="block min-[541px]:hidden space-y-3">
                                                    {filteredPrograms.map((programa) => (
                                                        <div key={programa.id_programa} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h5 className="font-bold text-gray-800 text-[10px]">{programa.nombre_programa}</h5>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${programa.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {programa.estado}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 text-[10px]">
                                                                <span className="font-medium text-gray-700">Ficha:</span> {programa.numero_ficha}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
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
                                            {/* Vista Tabla Desktop/Tablet (> 540px) */}
                                            <table className="w-full hidden min-[541px]:table">
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

                                            {/* Vista Tarjetas Mobile (<= 540px) */}
                                            <div className="block min-[541px]:hidden space-y-3">
                                                {filteredPrograms.map((programa) => (
                                                    <div key={programa.id_programa} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h5 className="font-bold text-gray-800 text-[10px]">{programa.nombre_programa}</h5>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${programa.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {programa.estado}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 text-[10px]">
                                                            <span className="font-medium text-gray-700">Ficha:</span> {programa.numero_ficha}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
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

            </div >


            {/* Modal de Detalles */}
            {
                showDetallesModal && selectedSolicitud && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pt-18 p-2" onClick={() => !procesando && setShowDetallesModal(false)}>
                        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-[modalAppear_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2 text-white">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold">Detalles de la Solicitud</h2>
                                    {!procesando && (
                                        <button onClick={() => setShowDetallesModal(false)} className="text-white hover:text-gray-200 text-3xl">&times;</button>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                                {/* Aprendiz y Fecha de Solicitud */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-indigo-600 uppercase font-semibold mb-2">Aprendiz</p>
                                        <p className="font-bold text-gray-800 text-sm">{selectedSolicitud.nombre_aprendiz} {selectedSolicitud.apellido_aprendiz}</p>
                                        <p className="text-xs text-gray-600">Doc: {selectedSolicitud.documento_aprendiz}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Fecha de Solicitud</p>
                                        <p className="font-bold text-gray-800 text-xs">{formatFechaHora(selectedSolicitud.fecha_solicitud)}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded-lg">
                                    <p className="text-xs text-indigo-600 uppercase font-semibold mb-1">Información del Programa</p>
                                    <p className="text-xs font-bold text-gray-800">{selectedSolicitud.nombre_programa}</p>
                                    <div className="flex gap-4 mt-1">
                                        <p className="text-sm text-gray-600">Ficha: {selectedSolicitud.numero_ficha}</p>
                                        <p className="text-sm text-gray-600">Jornada: {selectedSolicitud.nombre_jornada || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-50 p-2 rounded-lg">
                                        <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Hora Salida</p>
                                        <p className="font-semibold text-gray-800 text-xs">{formatTime12h(selectedSolicitud.hora_salida)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Hora Regreso</p>
                                        <p className="font-semibold text-gray-800 text-xs">{formatTime12h(selectedSolicitud.hora_regreso)}</p>
                                    </div>
                                    <div className="bg-green-50 border-l-4 border-green-500 p-2 rounded-lg col-span-2">
                                        <p className="text-[12px] text-green-700 uppercase font-semibold mb-1">Aprobada por Instructor</p>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {selectedSolicitud.nombre_instructor} {selectedSolicitud.apellido_instructor}
                                        </p>
                                    </div>
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded-lg col-span-2">
                                        <p className="text-[12px] text-gray-600 uppercase font-semibold mb-1">Motivo</p>
                                        <p className="text-xs text-gray-800 italic">{getMotivoTexto(selectedSolicitud.motivo, selectedSolicitud.motivo_otros)}</p>
                                    </div>

                                    {selectedSolicitud.soporte && (
                                        <div className="col-span-2">
                                            <button
                                                onClick={() => setShowSoporteModal(true)}
                                                className="w-full bg-white text-blue-600 border border-blue-600 py-2 rounded-lg font-bold hover:bg-blue-50 transition-all duration-300 flex items-center justify-center gap-2"
                                            >
                                                <span>📎</span> Visualizar Soporte Adjunto
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDetallesModal(false);
                                        setShowAprobarModal(true);
                                    }}
                                    disabled={procesando}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold text-base hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                                >
                                    Aprobar Final
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDetallesModal(false);
                                        setShowRechazarModal(true);
                                    }}
                                    disabled={procesando}
                                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-xl font-bold text-base hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                                >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Soporte */}
            {
                showSoporteModal && selectedSolicitud?.soporte && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 z-[10000] flex justify-center items-center backdrop-blur-sm p-4" onClick={() => setShowSoporteModal(false)}>
                        <div className="relative max-w-4xl w-full max-h-[90vh] flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowSoporteModal(false)}
                                className="absolute -top-10 right-0 text-white text-4xl hover:text-gray-300 focus:outline-none"
                            >
                                &times;
                            </button>
                            <img
                                src={`${API}/${selectedSolicitud.soporte}`}
                                alt="Soporte de la solicitud"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                        </div>
                    </div>
                )
            }

            {/* Modal de Aprobación */}
            {
                showAprobarModal && selectedSolicitud && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pt-20 p-4" onClick={() => !procesando && setShowAprobarModal(false)}>
                        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[modalAppear_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold">Aprobación Final</h2>
                                    {!procesando && (
                                        <button onClick={() => setShowAprobarModal(false)} className="text-white hover:text-gray-200 text-3xl">&times;</button>
                                    )}
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-700 text-sm mb-4 ">Se generará un código QR para la salida del aprendiz:</p>
                                <div className="bg-green-50 p-4 rounded-lg mb-4 border-l-4 border-green-500">
                                    <p className="font-semibold text-gray-800">{selectedSolicitud.nombre_aprendiz} {selectedSolicitud.apellido_aprendiz}</p>
                                    <p className="text-sm text-gray-600">{getMotivoTexto(selectedSolicitud.motivo, selectedSolicitud.motivo_otros)}</p>
                                </div>
                                <button
                                    onClick={aprobarSolicitud}
                                    disabled={procesando}
                                    className="text-sm w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                                >
                                    {procesando ? <>  Procesando <i class="fa-solid fa-spinner fa-spin-pulse"></i></> : <><i className="fas fa-check mr-2"></i>Confirmar Aprobación</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Rechazo */}
            {
                showRechazarModal && selectedSolicitud && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pt-20 p-4" onClick={() => !procesando && setShowRechazarModal(false)}>
                        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[modalAppear_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                                <div className="flex-items-center justify-between">
                                    <h2 className="text-2xl font-bold">Motivo de Rechazo</h2>
                                    {!procesando && (
                                        <button onClick={() => setShowRechazarModal(false)} className="text-white hover:text-gray-200 text-3xl">&times;</button>
                                    )}
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-700 mb-4">Especifique la razón del rechazo definitivo:</p>
                                <textarea
                                    value={motivoRechazo}
                                    onChange={(e) => setMotivoRechazo(e.target.value)}
                                    rows="4"
                                    placeholder="Escriba el motivo aquí..."
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none resize-none mb-4"
                                    disabled={procesando}
                                />
                                <button
                                    onClick={rechazarSolicitud}
                                    disabled={procesando || !motivoRechazo.trim()}
                                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {procesando ? <><i className="fas fa-spinner fa-spin mr-2"></i>Procesando...</> : <><i className="fas fa-ban mr-2"></i>Confirmar Rechazo</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
                @keyframes modalAppear {
                    from { opacity: 0; transform: scale(0.9) translateY(-20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </DashboardLayout >
    );
};

export default InicioCoordinacion;
