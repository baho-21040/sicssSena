import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

/**
 * Componente para proteger rutas basado en roles
 * @param {Array} allowedRoles - Array de roles permitidos (ej: ['Aprendiz', 'Instructor'])
 * @param {ReactNode} children - Componente hijo a renderizar si está autorizado
 */
export default function ProtectedRoute({ allowedRoles, children }) {
    const { user } = useUser();

    // Mostrar loading mientras se verifica la autenticación
    if (user.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <i className="fas fa-spinner fa-spin text-4xl text-[#39A900]"></i>
            </div>
        );
    }

    // Si no está autenticado, redirigir al login
    if (!user.isAuthenticated || !user.profile) {
        return <Navigate to="/login" replace />;
    }

    // Verificar si el rol del usuario está en los roles permitidos
    const userRole = user.profile.nombre_rol;
    const isAuthorized = allowedRoles.includes(userRole);

    // Si no está autorizado, redirigir a su dashboard correcto
    if (!isAuthorized) {
        // Mapeo de roles a sus dashboards
        const roleDashboards = {
            'Administrador': '/inicioadmin',
            'Aprendiz': '/aprendiz/inicio',
            'Instructor': '/instructor/inicio',
            'Coordinacion': '/coordinacion/inicio',
            'Vigilante': '/Vigilante/Inicio'
        };

        const redirectTo = roleDashboards[userRole] || '/login';
        return <Navigate to={redirectTo} replace />;
    }

    // Si está autorizado, renderizar el componente hijo
    return children;
}
