// src/components/SideMenu.jsx

import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.jsx';

// Lógica de Enlaces: Un solo lugar donde defines la estructura de cada menú.
const getMenuLinks = (role) => {
    switch (role) {
        case 'Administrador':
            return [
                { to: "/Inicioadmin", icon: "fas fa-home", label: "Inicio", active: true },
                { to: "/registrarusuario", icon: "fa-solid fa-user-plus", label: "Registrar usuario" },
                { to: "/buscarusuario", icon: "fas fa-users-cog", label: "Gestionar usuario" },
                { to: "/estado", icon: "fa-solid fa-user-lock", label: "Estado de cuenta" },
                { to: "/agregarprograma", icon: "fa-solid fa-chalkboard", label: "Crear Formación" },
                { to: "/programas", icon: "fas fa-chalkboard-teacher", label: "Formaciones" },

            ];
        case 'Instructor':
            return [
                { to: "/inicioinstructor", icon: "fas fa-chalkboard-teacher", label: "Inicio" },
                { to: "/instructor/registro", icon: "fas fa-plus", label: "Crear Contenido" },
                { to: "/instructor/alumnos", icon: "fas fa-users", label: "Mis Aprendices" },
            ];
        case 'Aprendiz':
            return [
                { to: "/aprendiz/inicio", icon: "fas fa-graduation-cap", label: "Inicio" },
                { to: "/Aprendiz/Solicitud", icon: "fas fa-book", label: "Nueva Solicitud" },
                { to: "/aprendiz/mensajes", icon: "fas fa-comment", label: "Mensajes" },
            ];

        case 'Vigilante':
            return [
                { to: "/vigilante/inicio", icon: "fas fa-graduation-cap", label: "Inicio" },
            ];
        default:
            return [];
    }
};

// Normaliza objeto usuario desde distintas fuentes de datos
const normalizeUser = (user) => {
    if (!user) return { nombreCompleto: '', rol: '', programa: null };
    // Soporta perfil del contexto: { nombre, apellido, nombre_rol, programa: { nombre_programa, numero_ficha } }
    const nombre = user.nombre || user.nombre_usuario || '';
    const apellido = user.apellido || '';
    const nombreCompleto = `${nombre} ${apellido}`.trim() || (user.nombre_usuario || '').trim();
    const rol = user.nombre_rol || user.rol_usuario || '';
    const programa = user.programa || (user.programa_usuario ? { nombre_programa: user.programa_usuario } : null);
    return { nombreCompleto, rol, programa };
};

const SideMenu = ({ isOpen, user, closeMenu }) => {
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const { logout } = useUser();
    const u = normalizeUser(user);
    const menuLinks = getMenuLinks(u.rol);

    const handleLogout = () => {
        logout();
        navigate('/login');
        closeMenu();
    };

    // Cierre por clic fuera del contenedor del menú
    useEffect(() => {
        const handleOutside = (e) => {
            if (!isOpen) return;
            const el = menuRef.current;
            if (el && !el.contains(e.target)) {
                closeMenu();
            }
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
        };
    }, [isOpen, closeMenu]);

    const buildUserSummary = () => {
        const base = `${u.nombreCompleto}`;
        const rol = u.rol ? ` ${u.rol}` : '';
        // Si es Aprendiz y tiene programa, añade formación y ficha
        const isAprendiz = (u.rol || '').toLowerCase().includes('aprendiz');
        let extra = '';
        if (isAprendiz && u.programa) {
            const form = u.programa.nombre_programa ? `Programa: ${u.programa.nombre_programa}` : '';
            const ficha = u.programa.numero_ficha ? `Ficha: ${u.programa.numero_ficha}` : '';
            const join = [form, ficha].filter(Boolean).join(' ');
            if (join) extra = `\n ${join}`; // en segunda línea dentro del bloque
        }
        return `${base}${rol}${extra}`.trim();
    };

    return (
        <>
            {/* Controlamos la visibilidad del menú usando el estado 'isOpen' y la clase CSS */}
            <nav
                id="sideMenu"
                className={`side-menu ${isOpen ? 'open' : ''}`}
                style={{ left: isOpen ? '0' : '-350px' }} // O usas la clase CSS 'open' si la defines
                ref={menuRef}>

                <a href="#" className="close-btn equix" onClick={closeMenu}>&times;</a>

                <div className="menu-profile">
                    <h4>{u.nombreCompleto}</h4>
                    {user?.correo && (
                        <small style={{
                            display: 'block',
                            wordBreak: 'break-word',
                            marginTop: '4px',
                            opacity: 0.8,
                            fontSize: '0.85em'
                        }}>
                            {user.correo}
                        </small>
                    )}
                    {u.rol && <small>{u.rol}</small>}
                    {((u.rol || '').toLowerCase().includes('aprendiz')) && u.programa && (
                        <small className="programa-info"><strong>
                            {u.programa.nombre_programa && (<span><br />{u.programa.nombre_programa}</span>)}
                            {u.programa.numero_ficha && (<span> <br /> Ficha: {u.programa.numero_ficha}</span>)}
</strong>
                        </small>
                    )}
                </div>

                {/* Mapeo de enlaces dinámicos */}
                {menuLinks.map((link, index) => (
                    <Link
                        key={index}
                        to={link.to}
                        className={link.active ? 'active' : ''}
                        onClick={closeMenu}
                    >
                        <i className={link.icon}></i> {link.label}
                    </Link>
                ))}

                <a href="#" onClick={handleLogout} className="cerrar-sesion"><i className="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
            </nav>

            {/* Overlay (también controlado por 'isOpen') */}
            <div
                id="menuOverlay"
                className={`menu-overlay ${isOpen ? 'active' : ''}`}
                onClick={closeMenu}
                aria-hidden="true"
            ></div>

            {/* Listener global ya aplicado vía useEffect para clic fuera del contenedor */}
        </>
    );
};

export default SideMenu;