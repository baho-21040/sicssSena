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
import { SoundProvider } from './contexts/SoundContext';




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
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/inicioadmin" element={<InicioAdmin />} />
        <Route path="/aprendiz/inicio" element={<InicioAprendiz />} />
        <Route path="/menu" element={<InicioAdmin />} />
        <Route path="/inicioaprendiz" element={<InicioAprendiz />} />
        <Route path="/iniciocoordinacion" element={<InicioCoordinacion />} />
        <Route path="/inicioinstructor" element={<InicioInstructor />} />
        <Route path="/Vigilante/Inicio" element={<InicioVigilante />} />
        <Route path="/registrarusuario" element={<RegistrarUsuario />} />
        <Route path="/BuscarUsuario" element={<BuscarUsuario />} />
        <Route path="/estado" element={<Estado />} />
        <Route path="/editarusuario/:id" element={<EditarUsuario />} />
        <Route path="/programas" element={<Programas />} />
        <Route path="/editarprograma/:id" element={<EditarPrograma />} />
        <Route path="/agregarprograma" element={<AgregarPrograma />} />
        <Route path="/Aprendiz/Solicitud" element={<SolicitudPermiso />} />
        <Route path="/Aprendiz/Espera" element={<EsperaSolicitud />} />
        <Route path="/login/claveolvidada" element={<ClaveOlvidada />} />
        <Route path="/aprendiz/editarperfil" element={<EditarPerfilAprendiz />} />
        <Route path="/aprendiz/historial" element={<HistorialAprendiz />} />
        <Route path="/instructor/historial" element={<HistorialInstructor />} />
        <Route path="/instructor/editarperfil" element={<EditarInstructor />} />
      </Routes>
    </SoundProvider>
  );
}

export default App;
