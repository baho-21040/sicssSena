// src/components/Header.jsx

import React from 'react';
import { useSound } from '../contexts/SoundContext';
// Asegúrate de que los estilos base.css están importados globalmente

const Header = ({ openMenu, title = "Dashboard del Sistema" }) => {
    const { soundEnabled, toggleSound } = useSound();

    return (
        <header className="main-header  border-b-8 border-b-blue-300">
            <div className="header-left">
                {/* Llama a la función openMenu que se pasa desde el componente padre */}
                <span className="menu-toggle" onClick={openMenu}>&#9776;</span>
                {/* Título dinámico o estático según lo necesites */}
                <h2>SICSS SENA</h2>
            </div>
            <div className="header-right">
                <button
                    onClick={toggleSound}
                    className={`notification-icon focus:outline-none transition-colors duration-300 ${!soundEnabled ? 'text-red-500' : 'text-gray-600'}`}
                    title={soundEnabled ? "Desactivar notificaciones sonoras" : "Activar notificaciones sonoras"}
                >
                    <i className={`fa-solid ${soundEnabled ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                </button>
            </div>
        </header>
    );
};

export default Header;