<?php
// Eliminar Programa desde Coordinación


header('Content-Type: application/json');

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'No autorizado']);
    exit;
}

// Obtener ID del programa
$uri = $_SERVER['REQUEST_URI'];
preg_match('/\/(\d+)$/', $uri, $matches);
$id_programa = $matches[1] ?? null;

if (!$id_programa) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'ID de programa no proporcionado']);
    exit;
}

try {
    $pdo = conexion();
    $stmt = $pdo->prepare("DELETE FROM programas_formacion WHERE id_programa = ?");
    $stmt->execute([$id_programa]);

    if ($stmt->rowCount() > 0) {
        http_response_code(200);
        echo json_encode(['status' => 'ok', 'message' => 'Programa eliminado']);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Programa no encontrado']);
    }
} catch (Throwable $e) {
    if (strpos($e->getMessage(), 'Constraint violation') !== false) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No se puede eliminar: el programa tiene aprendices o registros asociados.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error al eliminar programa']);
    }
}
