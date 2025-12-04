<?php
// backend/vigilante/routes.php

use Slim\App;

// Importar funciones de los controladores modulares
require_once __DIR__ . '/aprendiz/verificarqr.php';
require_once __DIR__ . '/aprendiz/registrar.php';
require_once __DIR__ . '/aprendiz/accesoshoy.php';
require_once __DIR__ . '/aprendiz/historial.php';
require_once __DIR__ . '/perfil/editarperfil.php';

return function (App $app) {
    // Rutas de Aprendiz / Accesos
    $app->post('/api/vigilante/verificar-qr', 'verificarQR');
    $app->post('/api/vigilante/registrar', 'registrarAcceso');
    $app->get('/api/vigilante/accesos-hoy', 'getAccesosHoy');
    
    // Rutas de Historial
    $app->get('/api/vigilante/historial', 'getHistorialVigilante');
    $app->delete('/api/vigilante/historial', 'vaciarHistorialVigilante');
    $app->delete('/api/vigilante/historial/{id}', 'ocultarAccesoVigilante');

    // Rutas de Perfil
    $app->get('/api/vigilante/perfil', 'getPerfilVigilante');
    $app->put('/api/vigilante/actualizar-correo', 'actualizarCorreoVigilante');
    $app->put('/api/vigilante/cambiar-contrasena', 'cambiarContrasenaVigilante');
};
