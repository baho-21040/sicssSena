<?php
// Cambiar Estado de Usuario desde Coordinación

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
    return $response->withStatus(401);
}

// Obtener ID del usuario
$id_usuario = $args['id'] ?? null;

if (!$id_usuario) {
    $uri = $_SERVER['REQUEST_URI'];
    preg_match('/\/(\d+)\/estado$/', $uri, $matches);
    $id_usuario = $matches[1] ?? null;
}

if (!$id_usuario) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'ID de usuario no proporcionado']));
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
    
    // Obtener datos del usuario antes de actualizar para el correo
    $stmtUser = $pdo->prepare("SELECT nombre, correo FROM usuarios WHERE id_usuario = ?");
    $stmtUser->execute([$id_usuario]);
    $usuarioDestino = $stmtUser->fetch(PDO::FETCH_ASSOC);

    $stmt = $pdo->prepare("UPDATE usuarios SET estado = ? WHERE id_usuario = ?");
    $stmt->execute([$nuevo_estado, $id_usuario]);

    // Si el usuario se desactiva, quitar el programa de formación
    if ($nuevo_estado === 'Inactivo') {
        $stmtProgram = $pdo->prepare("UPDATE usuarios SET id_programa = NULL WHERE id_usuario = ?");
        $stmtProgram->execute([$id_usuario]);
    }

    if ($stmt->rowCount() > 0) {
        // Enviar correo de notificación
        if ($usuarioDestino && !empty($usuarioDestino['correo'])) {
            try {
                require_once __DIR__ . '/../../email/estadocuenta.php';
                enviarCorreoEstadoCuenta($usuarioDestino['correo'], $usuarioDestino['nombre'], $nuevo_estado);
            } catch (Throwable $eEmail) {
                error_log("Error al enviar correo: " . $eEmail->getMessage());
                // No detenemos la ejecución, solo logueamos el error
            }
        }

        $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Estado actualizado y notificación enviada']));
        return $response->withStatus(200);
    } else {
        $check = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = ?");
        $check->execute([$id_usuario]);
        if ($check->fetch()) {
            $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Estado actualizado (sin cambios)']));
            return $response->withStatus(200);
        } else {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']));
            return $response->withStatus(404);
        }
    }
} catch (Throwable $e) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al actualizar estado: ' . $e->getMessage()]));
    return $response->withStatus(500);
}
