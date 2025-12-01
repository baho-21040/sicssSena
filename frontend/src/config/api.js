/**
 * Configuración dinámica de la URL del API
 * Se adapta automáticamente según desde dónde se acceda (localhost o red)
 */

function getApiBaseUrl() {
    const envUrl = import.meta.env.VITE_API_BASE_URL;

    // Si está configurado como 'auto', detectar automáticamente
    if (envUrl === 'auto' || !envUrl) {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol; // Detectar si es http: o https:

        // Si es localhost, usar localhost para el backend
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//localhost/SalidaSENA/backend/public`;
        }

        // Si es una IP de red, usar la misma IP para el backend
        return `${protocol}//${hostname}/SalidaSENA/backend/public`;
    }

    // Si hay una URL específica configurada, usarla
    return envUrl;
}

export const API_BASE_URL = getApiBaseUrl();

console.log('🔍 API URL detectada automáticamente:', API_BASE_URL);
