<?php
// Eliminar Usuario desde Coordinación


header('Content-Type: application/json');

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'No autorizado']);
    exit;
}

// Obtener ID del usuario a eliminar
$uri = $_SERVER['REQUEST_URI'];
preg_match('/\/(\d+)$/', $uri, $matches);
$id_usuario = $matches[1] ?? null;

if (!$id_usuario) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'ID de usuario no proporcionado']);
    exit;
}

try {
    $pdo = conexion();
    $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id_usuario = ?");
    $stmt->execute([$id_usuario]);

    if ($stmt->rowCount() > 0) {
        http_response_code(200);
        echo json_encode(['status' => 'ok', 'message' => 'Usuario eliminado']);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']);
    }
} catch (Throwable $e) {
    // Manejo de integridad referencial
    if (strpos($e->getMessage(), 'Constraint violation') !== false) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No se puede eliminar: el usuario tiene registros asociados.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error al eliminar usuario: ' . $e->getMessage()]);
    }
}
