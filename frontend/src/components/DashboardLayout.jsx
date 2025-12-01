import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import SideMenu from './SideMenu';
import Footer from './Footer';
import { useUser } from '../contexts/UserContext';

// Este componente envuelve todas las rutas que necesitan Header y SideMenu
const DashboardLayout = ({ children, headerTitle }) => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const openMenu = () => setIsMenuOpen(true);
    const closeMenu = () => setIsMenuOpen(false);

    // Redirigir cuando no está autenticado y la carga terminó
    useEffect(() => {
        if (!user.isLoading && !user.isAuthenticated) {
            navigate('/login');
        }
    }, [user.isLoading, user.isAuthenticated, navigate]);

    if (user.isLoading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                backgroundColor: '#f5f5f5',
                fontFamily: 'Arial, sans-serif'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '5px solid #e0e0e0',
                    borderTop: '5px solid #39a900',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{
                    marginTop: '20px',
                    fontSize: '18px',
                    color: '#333',
                    fontWeight: '500'
                }}>Verificando sesión...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }
    if (!user.isAuthenticated) {
        return null;
    }

    return (
        <div className="dashboard-wrapper">
            {/* Componentes REUTILIZABLES */}
            <Header
                openMenu={openMenu}
                title={headerTitle} // Título que cambia por página/ruta
            />
            <SideMenu
                isOpen={isMenuOpen}
                user={user.profile} // Aquí pasamos SOLO el perfil del usuario
                closeMenu={closeMenu}
            />

            {/* CONTENIDO ESPECÍFICO DE LA RUTA */}
            <div className="main-content-wrapper">
                {children}
            </div>
            <Footer />
        </div>
    );
};

export default DashboardLayout;