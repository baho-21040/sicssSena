import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SoundContext = createContext();

export const useSound = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
};

export const SoundProvider = ({ children }) => {
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('soundEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const audioRef = useRef(null);

    useEffect(() => {
        // Crear el elemento de audio con la ruta correcta
        audioRef.current = new Audio('/sonido/new-notification.mp3');
        audioRef.current.preload = 'auto';

        // Manejar errores de carga
        audioRef.current.onerror = (e) => {
            console.error('Error cargando el archivo de audio:', e);
        };

        // "Cebar" (Prime) el audio en la primera interacción del usuario
        const primeAudio = () => {
            if (audioRef.current) {
                // Reproducir y pausar inmediatamente para desbloquear el audio en algunos navegadores
                audioRef.current.play().then(() => {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }).catch(e => {
                    // Ignorar error si falla, es solo un intento de desbloqueo
                });
            }
            // Remover el listener una vez ejecutado
            document.removeEventListener('click', primeAudio);
            document.removeEventListener('keydown', primeAudio);
        };

        document.addEventListener('click', primeAudio);
        document.addEventListener('keydown', primeAudio);

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            document.removeEventListener('click', primeAudio);
            document.removeEventListener('keydown', primeAudio);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
    }, [soundEnabled]);

    const playNotificationSound = async () => {
        if (!soundEnabled || !audioRef.current) return;

        try {
            audioRef.current.currentTime = 0;
            const playPromise = audioRef.current.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('La reproducción automática fue bloqueada por el navegador. El usuario debe interactuar con la página primero.', error);
                });
            }
        } catch (error) {
            console.error('Error al reproducir sonido:', error);
        }
    };

    const toggleSound = () => {
        setSoundEnabled(prev => !prev);
    };

    return (
        <SoundContext.Provider value={{ soundEnabled, playNotificationSound, toggleSound }}>
            {children}
        </SoundContext.Provider>
    );
};
