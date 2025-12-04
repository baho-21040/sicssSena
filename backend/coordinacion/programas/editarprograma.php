<?php
// Editar Programa desde Coordinación

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
    return $response->withStatus(401);
}

// Obtener ID del programa
$id_programa = $args['id'] ?? null;

if (!$id_programa) {
    $uri = $_SERVER['REQUEST_URI'];
    preg_match('/\/(\d+)$/', $uri, $matches);
    $id_programa = $matches[1] ?? null;
}

if (!$id_programa) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'ID de programa no proporcionado']));
    return $response->withStatus(400);
}

$data = $request->getParsedBody();

$nombre_programa = $data['nombre_programa'] ?? '';
$nivel = $data['nivel'] ?? '';
$centro_formacion = $data['centro_formacion'] ?? '';
$numero_ficha = $data['numero_ficha'] ?? '';
$id_jornada = $data['id_jornada'] ?? '';

if (empty($nombre_programa) || empty($nivel) || empty($centro_formacion) || empty($numero_ficha) || empty($id_jornada)) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Todos los campos son obligatorios']));
    return $response->withStatus(400);
}

try {
    $pdo = conexion();
    $stmt = $pdo->prepare("UPDATE programas_formacion SET nombre_programa = ?, nivel = ?, centro_formacion = ?, numero_ficha = ?, id_jornada = ? WHERE id_programa = ?");
    $stmt->execute([$nombre_programa, $nivel, $centro_formacion, $numero_ficha, $id_jornada, $id_programa]);

    if ($stmt->rowCount() > 0) {
        $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Programa actualizado']));
        return $response->withStatus(200);
    } else {
        // Verificar si existe
        $check = $pdo->prepare("SELECT id_programa FROM programas_formacion WHERE id_programa = ?");
        $check->execute([$id_programa]);
        if ($check->fetch()) {
            $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Programa actualizado (sin cambios)']));
            return $response->withStatus(200);
        } else {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Programa no encontrado']));
            return $response->withStatus(404);
        }
    }
} catch (Throwable $e) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al actualizar programa']));
    return $response->withStatus(500);
}
