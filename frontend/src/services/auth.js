import { API_BASE_URL } from '../config/api.js';

const API = API_BASE_URL;

export async function login(documento, password) {
  try {
    console.log('🔗 auth.js: Haciendo fetch a:', `${API}/api/login`);
    const resp = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento, password }),
    });

    console.log('📡 auth.js: Respuesta recibida, status:', resp.status, 'ok:', resp.ok);

    // Siempre intentar parsear JSON
    const data = await resp.json().catch(() => ({ status: 'error', message: 'Error al parsear respuesta' }));
    console.log('📦 auth.js: Datos parseados:', data);

    // Si el servidor devuelve un error HTTP pero con JSON válido, devolver el JSON
    if (!resp.ok && !data.status) {
      return { status: 'error', message: data.message || `HTTP error! status: ${resp.status}` };
    }

    return data;
  } catch (error) {
    console.error('💥 auth.js: Error en login:', error);
    // Devolver un objeto con error en lugar de lanzar excepción
    return { status: 'error', message: error.message || 'Error de conexión con el servidor' };
  }
}

export async function selectAccount(id_usuario) {
  try {
    const resp = await fetch(`${API}/api/login/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${resp.status}`);
    }

    return await resp.json();
  } catch (error) {
    console.error('Error en selectAccount:', error);
    throw error;
  }
}

export async function getMe() {
  try {
    const token = localStorage.getItem('token');
    const resp = await fetch(`${API}/api/me`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${resp.status}`);
    }

    return await resp.json();
  } catch (error) {
    console.error('Error en getMe:', error);
    throw error;
  }
}