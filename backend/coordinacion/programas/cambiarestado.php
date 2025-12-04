<?php
// Cambiar Estado de Programa desde Coordinación

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
    return $response->withStatus(401);
}

// Obtener ID del programa
$id_programa = $args['id'] ?? null;

if (!$id_programa) {
    $uri = $_SERVER['REQUEST_URI'];
    preg_match('/\/(\d+)\/estado$/', $uri, $matches);
    $id_programa = $matches[1] ?? null;
}

if (!$id_programa) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'ID de programa no proporcionado']));
    return $response->withStatus(400);
}

$data = $request->getParsedBody();
$nuevo_estado = $data['estado'] ?? '';

if (!in_array($nuevo_estado, ['Activo', 'Inactivo'])) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Estado inválido']));
    return $response->withStatus(400);
}

try {
    $pdo = conexion();
    $stmt = $pdo->prepare("UPDATE programas_formacion SET estado = ? WHERE id_programa = ?");
    $stmt->execute([$nuevo_estado, $id_programa]);

    // Si el programa se desactiva, quitar el programa a todos los aprendices asociados
    if ($nuevo_estado === 'Inactivo') {
        $stmtUsers = $pdo->prepare("UPDATE usuarios SET id_programa = NULL WHERE id_programa = ?");
        $stmtUsers->execute([$id_programa]);
    }

    if ($stmt->rowCount() > 0) {
        $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Estado actualizado']));
        return $response->withStatus(200);
    } else {
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Programa no encontrado o estado sin cambios']));
        return $response->withStatus(404);
    }
} catch (Throwable $e) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al actualizar estado']));
    return $response->withStatus(500);
}
