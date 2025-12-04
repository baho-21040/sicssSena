<?php
// Editar Usuario desde Coordinación

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
    return $response->withStatus(401);
}

// Obtener ID del usuario a editar
$id_usuario = $args['id'] ?? null;

if (!$id_usuario) {
    $uri = $_SERVER['REQUEST_URI'];
    preg_match('/\/(\d+)$/', $uri, $matches);
    $id_usuario = $matches[1] ?? null;
}

if (!$id_usuario) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'ID de usuario no proporcionado']));
    return $response->withStatus(400);
}

$data = $request->getParsedBody();

// Validaciones básicas
if (empty($data['nombre']) || empty($data['apellido']) || empty($data['documento']) || empty($data['correo']) || empty($data['estado'])) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Datos incompletos']));
    return $response->withStatus(400);
}

if (strlen($data['documento']) < 6 || strlen($data['documento']) > 15) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'El documento debe tener entre 6 y 15 números']));
    return $response->withStatus(400);
}

if (!empty($data['clave']) && (strlen($data['clave']) < 6 || strlen($data['clave']) > 100)) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'La contraseña debe tener entre 6 y 100 caracteres']));
    return $response->withStatus(400);
}

try {
    $pdo = conexion();

    // Verificar duplicados (excluyendo al usuario actual)
    $stmt = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE ((documento = ? AND id_rol = ?) OR (correo = ? AND id_rol = ?)) AND id_usuario != ?");
    $stmt->execute([$data['documento'], $data['id_rol'], $data['correo'], $data['id_rol'], $id_usuario]);

    if ($stmt->fetch()) {
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'El documento o correo ya está en uso por otro usuario']));
        return $response->withStatus(400);
    }

    // Si el estado es Inactivo, forzar id_programa a NULL
    $id_programa = !empty($data['id_programa']) ? $data['id_programa'] : null;
    if ($data['estado'] === 'Inactivo') {
        $id_programa = null;
    }

    // Construir query dinámica para contraseña
    $sql = "UPDATE usuarios SET nombre = ?, apellido = ?, tipo_documento = ?, documento = ?, correo = ?, estado = ?, id_programa = ? ";
    $params = [
        $data['nombre'],
        $data['apellido'],
        $data['tipo_documento'],
        $data['documento'],
        $data['correo'],
        $data['estado'],
        $id_programa
    ];

    if (!empty($data['clave'])) {
        $sql .= ", contrasena = ? ";
        $params[] = password_hash($data['clave'], PASSWORD_DEFAULT);
    }

    $sql .= "WHERE id_usuario = ?";
    $params[] = $id_usuario;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Usuario actualizado']));
    return $response->withStatus(200);

} catch (Throwable $e) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al actualizar usuario: ' . $e->getMessage()]));
    return $response->withStatus(500);
}
