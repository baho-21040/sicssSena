<?php
// backend/vigilante/aprendiz/registrar.php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

function registrarAcceso(Request $request, Response $response) {
    $data = $request->getParsedBody();
    $id_aprobacion = $data['id_aprobacion'] ?? null;
    $tipo_acceso = $data['tipo_acceso'] ?? null; // 'SALIDA' o 'ENTRADA'
    $userData = verifyJwtFromHeader($request);
    if (!$userData || !isset($userData['sub'])) {
        $payload = ['status' => 'error', 'message' => 'Token inválido o expirado'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
    $id_vigilante = $userData['sub'];

    if (!$id_aprobacion || !$tipo_acceso || !$id_vigilante) {
        $payload = ['status' => 'error', 'message' => 'Datos incompletos'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $pdo = conexion();
    
    try {
        $sql = "INSERT INTO accesos (id_aprobacion, tipo_acceso, id_vigilante, fecha_hora) VALUES (:id_aprobacion, :tipo_acceso, :id_vigilante, NOW())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id_aprobacion' => $id_aprobacion,
            ':tipo_acceso' => $tipo_acceso,
            ':id_vigilante' => $id_vigilante
        ]);

        $payload = ['status' => 'ok', 'message' => 'Acceso registrado correctamente'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (PDOException $e) {
        $payload = ['status' => 'error', 'message' => 'Error al registrar acceso: ' . $e->getMessage()];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
}
