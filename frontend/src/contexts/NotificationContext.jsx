import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from './UserContext';
import { useSound } from './SoundContext';
import { API_BASE_URL } from '../config/api.js';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useUser();
    const { playNotificationSound } = useSound();

    const [notification, setNotification] = useState(null);
    const [solicitudesCount, setSolicitudesCount] = useState(0);
    const previousCountRef = useRef(-1);
    const intervalRef = useRef(null);

    // Determinar si el usuario es instructor o coordinación
    // Normalizar rol (puede venir como rol, nombre_rol, o rol_usuario según el backend)
    const profile = user?.profile || {};
    const rawRole = profile.rol || profile.nombre_rol || profile.rol_usuario || '';
    const userRole = rawRole.toString().toLowerCase();

    const isInstructor = userRole.includes('instructor');
    const isCoordinacion = userRole.includes('coordinacion') || userRole.includes('coordinación') || userRole.includes('coordinador');
    const shouldPoll = user?.isAuthenticated && (isInstructor || isCoordinacion);

    useEffect(() => {
        if (user?.isAuthenticated) {
            console.log('[NotificationContext] User authenticated. Raw Role:', rawRole, '=> Normalized:', userRole);
            console.log('[NotificationContext] Is Instructor:', isInstructor, 'Is Coordinacion:', isCoordinacion, 'Should Poll:', shouldPoll);
        }
    }, [user?.isAuthenticated, userRole, isInstructor, isCoordinacion, shouldPoll]);

    // Limpiar notificación
    const clearNotification = useCallback(() => {
        setNotification(null);
    }, []);

    // Mostrar notificación
    const showNotification = useCallback((message, type = 'success') => {
        setNotification({ message, type });
        // Auto-limpiar después de 4 segundos
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    }, []);

    const [debugLogs, setDebugLogs] = useState([]);

    const addDebugLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`${time}: ${msg}`, ...prev].slice(0, 5));
    }, []);

    // Función para cargar solicitudes y detectar nuevas
    const checkForNewSolicitudes = useCallback(async () => {
        if (!shouldPoll) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Determinar endpoint según el rol
            const endpoint = isInstructor
                ? `${API_BASE_URL}/api/instructor/solicitudes-pendientes`
                : `${API_BASE_URL}/api/coordinacion/solicitudes-pendientes`;

            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.status === 'ok') {
                const newCount = data.solicitudes?.length || 0;
                const prevCount = previousCountRef.current;

                // Si es la primera carga (-1), solo actualizamos el contador
                if (prevCount === -1) {
                    previousCountRef.current = newCount;
                    addDebugLog(`Init: ${newCount}`);
                } else if (newCount > prevCount) {
                    // Si hay más solicitudes que antes, notificar
                    console.log('🔔 Nueva solicitud detectada en NotificationContext!');
                    addDebugLog(`DETECTADO: ${prevCount} -> ${newCount}`);
                    playNotificationSound();
                    showNotification('🔔 Nueva solicitud recibida!', 'success');
                    previousCountRef.current = newCount;
                } else {
                    // Actualizar contador si disminuye o es igual
                    if (newCount !== prevCount) {
                        addDebugLog(`Actualizado: ${prevCount} -> ${newCount}`);
                    }
                    previousCountRef.current = newCount;
                }

                setSolicitudesCount(newCount);
            }
        } catch (err) {
            console.error('Error en polling de notificaciones:', err);
            addDebugLog(`Error: ${err.message}`);
        }
    }, [shouldPoll, isInstructor, playNotificationSound, showNotification, addDebugLog]);

    // Iniciar/detener polling según el rol del usuario
    useEffect(() => {
        // Limpiar intervalo anterior si existe
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (shouldPoll) {
            // No reseteamos previousCountRef aquí para evitar que se pierda el estado al navegar
            // Solo iniciamos el polling
            addDebugLog('Polling iniciado');

            // Primera verificación inmediata
            checkForNewSolicitudes();

            // Polling cada 5 segundos
            intervalRef.current = setInterval(checkForNewSolicitudes, 5000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [shouldPoll, checkForNewSolicitudes, addDebugLog]);

    // Resetear contador SOLO cuando el usuario cierra sesión explícitamente
    // Evitamos resetear durante estados de carga o navegación
    useEffect(() => {
        // Solo resetear si NO está cargando Y NO está autenticado
        // Esto previene resets accidentales durante transiciones
        if (!user?.isLoading && !user?.isAuthenticated) {
            console.log('[NotificationContext] Sesión finalizada. Reseteando contador.');
            previousCountRef.current = -1;
            setSolicitudesCount(0);
            setDebugLogs([]);
        }
    }, [user?.isLoading, user?.isAuthenticated]);

    return (
        <NotificationContext.Provider value={{
            notification,
            solicitudesCount,
            clearNotification,
            showNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
