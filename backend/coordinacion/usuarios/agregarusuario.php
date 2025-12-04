<?php
// Crear Usuario desde Coordinación


$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
}

$data = $request->getParsedBody();

// Validaciones básicas
if (empty($data['nombre']) || empty($data['apellido']) || empty($data['documento']) || empty($data['correo']) || empty($data['clave']) || empty($data['id_rol'])) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Datos incompletos']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
}

if (strlen($data['documento']) < 6 || strlen($data['documento']) > 15) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'El documento debe tener entre 6 y 15 números']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
}

if (strlen($data['clave']) < 6 || strlen($data['clave']) > 100) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'La contraseña debe tener entre 6 y 100 caracteres']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
}

try {
    $pdo = conexion();

    // 1. Verificar si el documento ya existe
    $stmt = $pdo->prepare("SELECT correo, id_rol FROM usuarios WHERE documento = ?");
    $stmt->execute([$data['documento']]);
    $existing_users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($existing_users)) {
        // El documento existe. Verificar consistencia de correo.
        // Asumimos que todos los registros del mismo documento deben tener el mismo correo.
        $first_user = $existing_users[0];
        if ($first_user['correo'] !== $data['correo']) {
             $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Este documento ya está registrado con otro correo electrónico']));
             return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        // El correo coincide. Verificar si ya tiene el rol solicitado.
        foreach ($existing_users as $u) {
            if ($u['id_rol'] == $data['id_rol']) {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'El usuario ya tiene este rol asignado']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
            }
        }
        
        // Si llegamos aquí, es el mismo usuario (mismo doc, mismo correo) agregando un NUEVO rol.
        // Permitimos la inserción.
    } else {
        // El documento NO existe. Verificar si el correo existe (para evitar duplicados de correo con diferente doc).
        $stmt = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE correo = ?");
        $stmt->execute([$data['correo']]);
        if ($stmt->fetch()) {
             $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Este correo electrónico ya está registrado con otro documento']));
             return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }
        
        // Si llegamos aquí, es un usuario totalmente nuevo.
        // Permitimos la inserción.
    }

    $sql = "INSERT INTO usuarios (nombre, apellido, tipo_documento, documento, correo, contrasena, id_rol, id_programa, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $pdo->prepare($sql);
    $hash = password_hash($data['clave'], PASSWORD_DEFAULT);
    $id_programa = !empty($data['id_programa']) ? $data['id_programa'] : null;

    $stmt->execute([
        $data['nombre'],
        $data['apellido'],
        $data['tipo_documento'],
        $data['documento'],
        $data['correo'],
        $hash,
        $data['id_rol'],
        $id_programa,
        $data['estado']
    ]);

    $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Usuario creado']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

} catch (Throwable $e) {
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al crear usuario: ' . $e->getMessage()]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
}
