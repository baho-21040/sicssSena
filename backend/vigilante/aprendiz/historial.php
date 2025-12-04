<?php
// backend/vigilante/aprendiz/historial.php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

function getHistorialVigilante(Request $request, Response $response) {
    $pdo = conexion();
    $userData = verifyJwtFromHeader($request);
    if (!$userData || !isset($userData['sub'])) {
        $payload = ['status' => 'error', 'message' => 'Token inválido o expirado'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
    $id_vigilante = $userData['sub'];

    try {
        $sql = "SELECT 
                    acc.id_acceso,
                    acc.tipo_acceso,
                    acc.fecha_hora AS fecha_acceso,
                    u.nombre AS nombre_aprendiz,
                    u.apellido AS apellido_aprendiz,
                    u.documento AS documento_aprendiz,
                    p.motivo,
                    p.descripcion,
                    p.soporte,
                    p.hora_salida,
                    p.hora_regreso,
                    pf.nombre_programa,
                    pf.numero_ficha,
                    pf.centro_formacion,
                    j.nombre_jornada,
                    ui.nombre AS nombre_instructor,
                    ui.apellido AS apellido_instructor,
                    ui.documento AS documento_instructor,
                    uc.nombre AS nombre_coordinador,
                    uc.apellido AS apellido_coordinador,
                    uc.documento AS documento_coordinador,
                    a.qr,
                    a.estado_aprobacion
                FROM accesos acc
                JOIN aprobaciones a ON acc.id_aprobacion = a.id_aprobacion
                JOIN permisos p ON a.id_permiso = p.id_permiso
                JOIN usuarios u ON p.id_usuario = u.id_usuario
                LEFT JOIN programas_formacion pf ON u.id_programa = pf.id_programa
                LEFT JOIN jornadas j ON pf.id_jornada = j.id_jornada
                LEFT JOIN usuarios ui ON p.id_instructor_destino = ui.id_usuario
                LEFT JOIN usuarios uc ON a.id_usuario_aprobador = uc.id_usuario
                /* WHERE acc.id_vigilante = :id_vigilante */
                WHERE (acc.oculto_vigilante = 0 OR acc.oculto_vigilante IS NULL)
                ORDER BY acc.fecha_hora DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(/* [':id_vigilante' => $id_vigilante] */);
        $historial = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $payload = [
            'status' => 'ok',
            'historial' => $historial
        ];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (PDOException $e) {
        $payload = ['status' => 'error', 'message' => 'Error al obtener historial: ' . $e->getMessage()];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
}

function vaciarHistorialVigilante(Request $request, Response $response) {
    $pdo = conexion();
    $userData = verifyJwtFromHeader($request);
    if (!$userData || !isset($userData['sub'])) {
        $payload = ['status' => 'error', 'message' => 'Token inválido o expirado'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
    $id_vigilante = $userData['sub'];

    try {
        // Soft delete: Marcar como oculto para el vigilante
        $sql = "UPDATE accesos SET oculto_vigilante = 1 WHERE id_vigilante = :id_vigilante";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id_vigilante' => $id_vigilante]);

        $payload = ['status' => 'ok', 'message' => 'Historial vaciado correctamente'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (PDOException $e) {
        $payload = ['status' => 'error', 'message' => 'Error al vaciar historial: ' . $e->getMessage()];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
}

function ocultarAccesoVigilante(Request $request, Response $response, $args) {
    $pdo = conexion();
    $userData = verifyJwtFromHeader($request);
    if (!$userData || !isset($userData['sub'])) {
        $payload = ['status' => 'error', 'message' => 'Token inválido o expirado'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
    $id_vigilante = $userData['sub'];
    $id_acceso = $args['id'];

    try {
        // Soft delete: Marcar como oculto para el vigilante (solo un registro)
        $sql = "UPDATE accesos SET oculto_vigilante = 1 WHERE id_acceso = :id_acceso AND id_vigilante = :id_vigilante";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id_acceso' => $id_acceso, ':id_vigilante' => $id_vigilante]);

        if ($stmt->rowCount() > 0) {
            $payload = ['status' => 'ok', 'message' => 'Registro eliminado del historial'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        } else {
            $payload = ['status' => 'error', 'message' => 'No se pudo eliminar el registro (puede que no exista o no te pertenezca)'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

    } catch (PDOException $e) {
        $payload = ['status' => 'error', 'message' => 'Error al eliminar registro: ' . $e->getMessage()];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
}
