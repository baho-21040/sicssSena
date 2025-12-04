<?php
// backend/vigilante/aprendiz/accesoshoy.php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

function getAccesosHoy(Request $request, Response $response) {
    $pdo = conexion();
    
    try {
        $sql = "SELECT 
                    acc.id_acceso,
                    acc.tipo_acceso,
                    acc.fecha_hora AS fecha_acceso,
                    u.nombre,
                    u.apellido,
                    CONCAT(u.nombre, ' ', u.apellido) AS aprendiz,
                    u.documento,
                    p.motivo
                FROM accesos acc
                JOIN aprobaciones a ON acc.id_aprobacion = a.id_aprobacion
                JOIN permisos p ON a.id_permiso = p.id_permiso
                JOIN usuarios u ON p.id_usuario = u.id_usuario
                WHERE DATE(acc.fecha_hora) = CURDATE()
                ORDER BY acc.fecha_hora DESC";
        
        $stmt = $pdo->query($sql);
        $accesos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $payload = [
            'status' => 'ok',
            'accesos' => $accesos
        ];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (PDOException $e) {
        $payload = ['status' => 'error', 'message' => 'Error al obtener accesos: ' . $e->getMessage()];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
}
