import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/acceso/login.jsx";
import InicioAdmin from "./pages/admin/index.jsx";
import InicioAprendiz from "./pages/aprendiz/inicio.jsx";
import InicioCoordinacion from "./pages/coordinacion/index.jsx";
import InicioInstructor from "./pages/instructor/inicio.jsx";
import InicioVigilante from "./pages/vigilante/index.jsx";
import RegistrarUsuario from "./pages/admin/usuario/registrar.jsx";
import BuscarUsuario from "./pages/admin/usuario/buscarusuario.jsx";
import Estado from "./pages/admin/usuario/estado.jsx";
import EditarUsuario from "./pages/admin/usuario/editarusuario.jsx";
import Programas from "./pages/admin/programas/programas.jsx";
import EditarPrograma from "./pages/admin/programas/editarprograma.jsx";
import AgregarPrograma from "./pages/admin/programas/agregarprograma.jsx";
import SolicitudPermiso from "./pages/aprendiz/solicitud.jsx";
import EsperaSolicitud from "./pages/aprendiz/espera.jsx";
import ClaveOlvidada from "./pages/acceso/ClaveOlvidada.jsx";
import EditarPerfilAprendiz from "./pages/aprendiz/editar.jsx";
import HistorialAprendiz from "./pages/aprendiz/historial.jsx";
import HistorialInstructor from "./pages/instructor/historial.jsx";
import EditarInstructor from "./pages/instructor/editar.jsx";
import RegistrarUsuarioCoord from "./pages/coordinacion/usuario/registrar.jsx";
import BuscarUsuarioCoord from "./pages/coordinacion/usuario/buscarusuario.jsx";
import EditarUsuarioCoord from "./pages/coordinacion/usuario/editarusuario.jsx";
import EstadoCoord from "./pages/coordinacion/usuario/estado.jsx";
import ProgramasCoord from "./pages/coordinacion/programas/programas.jsx";
import AgregarProgramaCoord from "./pages/coordinacion/programas/agregarprograma.jsx";
import EditarProgramaCoord from "./pages/coordinacion/programas/editarprograma.jsx";
import EditarCoordinacion from "./pages/coordinacion/editar.jsx";
import HistorialCoordinacion from "./pages/coordinacion/historial.jsx";
import HistorialVigilante from "./pages/vigilante/historial.jsx";
import EditarVigilante from "./pages/vigilante/editar.jsx";
import { SoundProvider } from './contexts/SoundContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute.jsx';




/*AOS animaciones*/
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useEffect } from "react";


function App() {


  useEffect(() => {
    AOS.init({
      duration: 800, // Duración de la animación en milisegundos
      easing: 'ease-in-out', // Tipo de easing para la animación
      once: true, // Si la animación debe ocurrir solo una vez al hacer scroll
    });
  }, []);

  return (
    <SoundProvider>
      <NotificationProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/claveolvidada" element={<ClaveOlvidada />} />

          {/* Rutas de Administrador */}
          <Route path="/inicioadmin" element={<ProtectedRoute allowedRoles={['Administrador']}><InicioAdmin /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute allowedRoles={['Administrador']}><InicioAdmin /></ProtectedRoute>} />
          <Route path="/registrarusuario" element={<ProtectedRoute allowedRoles={['Administrador']}><RegistrarUsuario /></ProtectedRoute>} />
          <Route path="/BuscarUsuario" element={<ProtectedRoute allowedRoles={['Administrador']}><BuscarUsuario /></ProtectedRoute>} />
          <Route path="/estado" element={<ProtectedRoute allowedRoles={['Administrador']}><Estado /></ProtectedRoute>} />
          <Route path="/editarusuario/:id" element={<ProtectedRoute allowedRoles={['Administrador']}><EditarUsuario /></ProtectedRoute>} />
          <Route path="/programas" element={<ProtectedRoute allowedRoles={['Administrador']}><Programas /></ProtectedRoute>} />
          <Route path="/editarprograma/:id" element={<ProtectedRoute allowedRoles={['Administrador']}><EditarPrograma /></ProtectedRoute>} />
          <Route path="/agregarprograma" element={<ProtectedRoute allowedRoles={['Administrador']}><AgregarPrograma /></ProtectedRoute>} />

          {/* Rutas de Aprendiz */}
          <Route path="/aprendiz/inicio" element={<ProtectedRoute allowedRoles={['Aprendiz']}><InicioAprendiz /></ProtectedRoute>} />
          <Route path="/inicioaprendiz" element={<ProtectedRoute allowedRoles={['Aprendiz']}><InicioAprendiz /></ProtectedRoute>} />
          <Route path="/Aprendiz/Solicitud" element={<ProtectedRoute allowedRoles={['Aprendiz']}><SolicitudPermiso /></ProtectedRoute>} />
          <Route path="/Aprendiz/Espera" element={<ProtectedRoute allowedRoles={['Aprendiz']}><EsperaSolicitud /></ProtectedRoute>} />
          <Route path="/aprendiz/editarperfil" element={<ProtectedRoute allowedRoles={['Aprendiz']}><EditarPerfilAprendiz /></ProtectedRoute>} />
          <Route path="/aprendiz/historial" element={<ProtectedRoute allowedRoles={['Aprendiz']}><HistorialAprendiz /></ProtectedRoute>} />

          {/* Rutas de Instructor */}
          <Route path="/instructor/inicio" element={<ProtectedRoute allowedRoles={['Instructor']}><InicioInstructor /></ProtectedRoute>} />
          <Route path="/instructor/historial" element={<ProtectedRoute allowedRoles={['Instructor']}><HistorialInstructor /></ProtectedRoute>} />
          <Route path="/instructor/editarperfil" element={<ProtectedRoute allowedRoles={['Instructor']}><EditarInstructor /></ProtectedRoute>} />

          {/* Rutas de Coordinación */}
          <Route path="/coordinacion/inicio" element={<ProtectedRoute allowedRoles={['Coordinacion']}><InicioCoordinacion /></ProtectedRoute>} />
          <Route path="/coordinacion/editarperfil" element={<ProtectedRoute allowedRoles={['Coordinacion']}><EditarCoordinacion /></ProtectedRoute>} />
          <Route path="/coordinacion/historial" element={<ProtectedRoute allowedRoles={['Coordinacion']}><HistorialCoordinacion /></ProtectedRoute>} />

          {/* Rutas de Gestión Coordinación */}
          <Route path="/coordinacion/registrarusuario" element={<ProtectedRoute allowedRoles={['Coordinacion']}><RegistrarUsuarioCoord /></ProtectedRoute>} />
          <Route path="/coordinacion/busquedadeusuario" element={<ProtectedRoute allowedRoles={['Coordinacion']}><BuscarUsuarioCoord /></ProtectedRoute>} />
          <Route path="/coordinacion/editarusuario/:id" element={<ProtectedRoute allowedRoles={['Coordinacion']}><EditarUsuarioCoord /></ProtectedRoute>} />
          <Route path="/coordinacion/estado" element={<ProtectedRoute allowedRoles={['Coordinacion']}><EstadoCoord /></ProtectedRoute>} />

          <Route path="/coordinacion/programas" element={<ProtectedRoute allowedRoles={['Coordinacion']}><ProgramasCoord /></ProtectedRoute>} />
          <Route path="/coordinacion/registrarprograma" element={<ProtectedRoute allowedRoles={['Coordinacion']}><AgregarProgramaCoord /></ProtectedRoute>} />
          <Route path="/coordinacion/editarprograma/:id" element={<ProtectedRoute allowedRoles={['Coordinacion']}><EditarProgramaCoord /></ProtectedRoute>} />

          {/* Rutas de Vigilante */}
          <Route path="/Vigilante/Inicio" element={<ProtectedRoute allowedRoles={['Vigilante']}><InicioVigilante /></ProtectedRoute>} />
          <Route path="/vigilante/historial" element={<ProtectedRoute allowedRoles={['Vigilante']}><HistorialVigilante /></ProtectedRoute>} />
          <Route path="/vigilante/editarperfil" element={<ProtectedRoute allowedRoles={['Vigilante']}><EditarVigilante /></ProtectedRoute>} />
        </Routes>
      </NotificationProvider>
    </SoundProvider>
  );
}

export default App;
