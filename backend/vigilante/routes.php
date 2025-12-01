<?php
// backend/vigilante/routes.php

use Slim\App;

return function (App $app) {
    $controller = new VigilanteController();

    $app->post('/api/vigilante/verificar-qr', [$controller, 'verificarQR']);
    $app->post('/api/vigilante/registrar', [$controller, 'registrarAcceso']);
    $app->get('/api/vigilante/accesos-hoy', [$controller, 'getAccesosHoy']);
};
