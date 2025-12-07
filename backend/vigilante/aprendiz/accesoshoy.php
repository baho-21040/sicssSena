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
                    u.documento,
                    p.motivo,
                    a.observaciones,
                    p.hora_regreso,
                    p.descripcion AS descripcion_permiso,
                    p.soporte,
                    p.hora_salida,
                    pf.nombre_programa,
                    pf.numero_ficha,
                    j.nombre_jornada,
                    u_inst.nombre AS nombre_instructor,
                    u_inst.apellido AS apellido_instructor,
                    u_inst.documento AS documento_instructor,
                    u_coord.nombre AS nombre_coordinador,
                    u_coord.apellido AS apellido_coordinador,
                    u_coord.documento AS documento_coordinador
                FROM accesos acc
                JOIN aprobaciones a ON acc.id_aprobacion = a.id_aprobacion
                JOIN permisos p ON a.id_permiso = p.id_permiso
                JOIN usuarios u ON p.id_usuario = u.id_usuario
                LEFT JOIN programas_formacion pf ON u.id_programa = pf.id_programa
                LEFT JOIN jornadas j ON pf.id_jornada = j.id_jornada
                LEFT JOIN usuarios u_inst ON p.id_instructor_destino = u_inst.id_usuario
                LEFT JOIN usuarios u_coord ON a.id_usuario_aprobador = u_coord.id_usuario
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
