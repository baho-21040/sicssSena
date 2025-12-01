import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SoundContext = createContext();

export const useSound = () => {
    return useContext(SoundContext);
};

export const SoundProvider = ({ children }) => {
    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioRef = useRef(new Audio('/sonido/new-notification.mp3'));

    // Cargar preferencia del usuario al iniciar
    useEffect(() => {
        const savedPreference = localStorage.getItem('sound_enabled');
        if (savedPreference === 'true') {
            setSoundEnabled(true);
        }
    }, []);

    // Guardar preferencia cuando cambia
    useEffect(() => {
        localStorage.setItem('sound_enabled', soundEnabled);
    }, [soundEnabled]);

    const toggleSound = () => {
        if (!soundEnabled) {
            // Intentar reproducir para desbloquear audio context
            audioRef.current.volume = 0.7;
            audioRef.current.play().then(() => {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setSoundEnabled(true);
            }).catch(err => {
                console.error("Error al activar audio:", err);
                // Aún así marcamos como true para intentar en el futuro o mostrar UI activa
                setSoundEnabled(true);
            });
        } else {
            setSoundEnabled(false);
        }
    };

    const playNotificationSound = () => {
        if (soundEnabled) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => console.error("Error reproduciendo sonido:", err));
        }
    };

    return (
        <SoundContext.Provider value={{ soundEnabled, toggleSound, playNotificationSound }}>
            {children}
        </SoundContext.Provider>
    );
};
