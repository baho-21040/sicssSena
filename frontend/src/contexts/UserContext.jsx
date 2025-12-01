import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe } from '../services/auth.js';
import { API_BASE_URL } from '../config/api.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState({ isAuthenticated: false, profile: null, token: null, isLoading: true });
  const [loading, setLoading] = useState(true);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const navigate = useNavigate();

  // Carga inicial desde localStorage y consulta /api/me
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          let data;
          const contentType = response.headers.get('content-type');

          // Intentar parsear JSON independientemente del header, pero usar el header como pista
          try {
            data = await response.json();
          } catch (e) {
            // Si falla el parseo, entonces sí es un error real
            if (!contentType || !contentType.includes('application/json')) {
              const text = await response.text().catch(() => '');
              console.error('Error: La respuesta no es JSON válido y no tiene el header correcto.');
              console.error('Contenido:', text.substring(0, 200));
            }
            throw e;
          }

          if (data.status === 'ok') {
            setUser({ isAuthenticated: true, profile: data.user, token, isLoading: false });
            if (data.user.estado === 'Inactivo') {
              setIsDeactivated(true);
            }
          } else {
            // Solo borrar token si el servidor explícitamente dice que es inválido
            localStorage.removeItem('token');
            setUser({ isAuthenticated: false, profile: null, token: null, isLoading: false });
          }
        } catch (error) {
          console.error('Error verificando sesión:', error);
          // No borrar token preventivamente
          setUser({ isAuthenticated: false, profile: null, token: null, isLoading: false });
        }
      } else {
        setUser({ isAuthenticated: false, profile: null, token: null, isLoading: false });
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  // Sincronización de pestañas (storage event)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          // Si hay un nuevo token (login en otra pestaña), recargar usuario
          window.location.reload();
        } else {
          // Si se eliminó el token (logout en otra pestaña), cerrar sesión aquí
          setUser({ isAuthenticated: false, profile: null, token: null, isLoading: false });
          setIsDeactivated(false);
          navigate('/login');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  // Polling para verificar estado de cuenta cada 10 segundos
  useEffect(() => {
    if (!user.isAuthenticated || !user.token) return;

    const interval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          let data;
          try {
            data = await response.json();
          } catch (e) {
            console.error('Error en polling: respuesta no es JSON válido');
            return;
          }

          if (data.status === 'ok') {
            if (data.user.estado === 'Inactivo') {
              setIsDeactivated(true);
            }
          } else if (response.status === 401) {
            // Token inválido o expirado
            logout();
          }
        } catch (error) {
          console.error('Error polling user status:', error);
        }
      }
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [user.isAuthenticated, user.token]);

  // Función para actualizar el usuario después del login
  const loginUser = async (token) => {
    localStorage.setItem('token', token);
    setUser(prev => ({ ...prev, token, isLoading: true }));

    try {
      const data = await getMe();
      if (data && data.status === 'ok') {
        setUser({ isAuthenticated: true, profile: data.user, token, isLoading: false });
      } else {
        console.log('UserContext: Token inválido después de login. Eliminando token.');
        localStorage.removeItem('token');
        setUser({ isAuthenticated: false, profile: null, token: null, isLoading: false });
      }
    } catch (e) {
      console.error('Error al cargar perfil después del login:', e);
      console.log('UserContext: Error después de login. Eliminando token.');
      localStorage.removeItem('token');
      setUser({ isAuthenticated: false, profile: null, token: null, isLoading: false });
    }
  };

  const logout = () => {
    setUser({ isAuthenticated: false, profile: null, token: null, isLoading: false });
    localStorage.removeItem('token');
    setIsDeactivated(false);
    // Redirigir al login usando navigate
    navigate('/login');
  };

  // Modal de bloqueo por desactivación
  if (isDeactivated) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '10px',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>Cuenta Desactivada</h2>
          <p style={{ marginBottom: '1.5rem', color: '#333' }}>
            Tu cuenta ha sido desactivada por la administración.
            Por favor contacta al soporte si crees que es un error.
          </p>
          <button
            onClick={logout}
            style={{
              backgroundColor: '#39A900',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Entendido, ir al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, loginUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}