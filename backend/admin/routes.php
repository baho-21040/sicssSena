<?php
use Slim\Psr7\Response;

return function ($app) {
    // Obtener lista de programas (con búsqueda)
    $app->get('/api/programas', function ($request, $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $params = $request->getQueryParams();
        $q = $params['q'] ?? '';

        try {
            $pdo = conexion();
            $sql = "SELECT p.*, j.nombre_jornada 
                    FROM programas_formacion p
                    LEFT JOIN jornadas j ON p.id_jornada = j.id_jornada";

            if (!empty($q)) {
                $sql .= " WHERE p.nombre_programa LIKE :q OR p.numero_ficha LIKE :q";
            }

            $sql .= " ORDER BY p.id_programa DESC";

            $stmt = $pdo->prepare($sql);

            if (!empty($q)) {
                $term = '%' . $q . '%';
                $stmt->execute([':q' => $term]);
            } else {
                $stmt->execute();
            }

            $programas = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode(['status' => 'ok', 'programas' => $programas]));
            return $response->withStatus(200);
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al buscar programas']));
            return $response->withStatus(500);
        }
    });

    // Obtener lista de jornadas
    $app->get('/api/jornadas', function ($request, $response) {
        try {
            $pdo = conexion();
            $stmt = $pdo->query("SELECT * FROM jornadas");
            $jornadas = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode(['status' => 'ok', 'jornadas' => $jornadas]));
            return $response->withStatus(200);
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al obtener jornadas']));
            return $response->withStatus(500);
        }
    });

    // Crear nuevo programa
    $app->post('/api/programas', function ($request, $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user || strcasecmp($user['nombre_rol'] ?? '', 'Administrador') !== 0) {
            $rol = $user['nombre_rol'] ?? 'Sin rol';
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => "No autorizado. Rol recibido: $rol"]));
            return $response->withStatus(401);
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
            
            // Verificar si ya existe un programa con el mismo número de ficha
            $checkStmt = $pdo->prepare("SELECT id_programa FROM programas_formacion WHERE numero_ficha = ?");
            $checkStmt->execute([$numero_ficha]);
            if ($checkStmt->fetch()) {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Ya existe un programa con ese número de ficha']));
                return $response->withStatus(400);
            }

            // Insertar el nuevo programa
            $stmt = $pdo->prepare("INSERT INTO programas_formacion (nombre_programa, nivel, centro_formacion, numero_ficha, id_jornada, estado) VALUES (?, ?, ?, ?, ?, 'Activo')");
            $stmt->execute([$nombre_programa, $nivel, $centro_formacion, $numero_ficha, $id_jornada]);

            $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Programa registrado exitosamente', 'id' => $pdo->lastInsertId()]));
            return $response->withStatus(201);
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al registrar programa: ' . $e->getMessage()]));
            return $response->withStatus(500);
        }
    });


    // Eliminar Programa
    $app->delete('/api/programas/{id}', function ($request, $response, $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user || strcasecmp($user['nombre_rol'] ?? '', 'Administrador') !== 0) {
            $rol = $user['nombre_rol'] ?? 'Sin rol';
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => "No autorizado. Rol recibido: $rol"]));
            return $response->withStatus(401);
        }

        $id_programa = $args['id'];

        try {
            $pdo = conexion();
            $stmt = $pdo->prepare("DELETE FROM programas_formacion WHERE id_programa = ?");
            $stmt->execute([$id_programa]);

            if ($stmt->rowCount() > 0) {
                $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Programa eliminado']));
                return $response->withStatus(200);
            } else {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Programa no encontrado']));
                return $response->withStatus(404);
            }
        } catch (Throwable $e) {
            if (strpos($e->getMessage(), 'Constraint violation') !== false) {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No se puede eliminar: el programa tiene aprendices o registros asociados.']));
                return $response->withStatus(400);
            }
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al eliminar programa']));
            return $response->withStatus(500);
        }
    });

    // Actualizar Estado de Programa
    $app->put('/api/programas/{id}/estado', function ($request, $response, $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user || strcasecmp($user['nombre_rol'] ?? '', 'Administrador') !== 0) {
            $rol = $user['nombre_rol'] ?? 'Sin rol';
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => "No autorizado. Rol recibido: $rol"]));
            return $response->withStatus(401);
        }

        $id_programa = $args['id'];
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
    });

    // Obtener un programa por ID
    $app->get('/api/programas/{id}', function ($request, $response, $args) {
        $id_programa = $args['id'];

        try {
            $pdo = conexion();
            $stmt = $pdo->prepare("SELECT * FROM programas_formacion WHERE id_programa = ?");
            $stmt->execute([$id_programa]);
            $programa = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($programa) {
                $response->getBody()->write(json_encode(['status' => 'ok', 'programa' => $programa]));
                return $response->withStatus(200);
            } else {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Programa no encontrado']));
                return $response->withStatus(404);
            }
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al obtener programa']));
            return $response->withStatus(500);
        }
    });

    // Actualizar Programa
    $app->put('/api/programas/{id}', function ($request, $response, $args) {
        $user = verifyJwtFromHeader($request);
        if ($user === null) {
            $header = $request->getHeaderLine('Authorization');
            if (empty($header)) {
                $msg = 'No autorizado. Header Authorization no recibido por el backend.';
            } else {
                $msg = 'No autorizado. Token inválido o expirado. Header recibido (inicio): ' . substr($header, 0, 20) . '...';
            }
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => $msg]));
            return $response->withStatus(401);
        }
        if (strcasecmp($user['nombre_rol'] ?? '', 'Administrador') !== 0) {
            $rol = $user['nombre_rol'] ?? 'Sin rol (propiedad faltante)';
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => "No autorizado. Rol recibido: $rol"]));
            return $response->withStatus(401);
        }

        $id_programa = $args['id'];
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
                // Puede ser que no se actualizó nada porque los datos son iguales, pero el ID existe.
                // Verificamos si existe
                $check = $pdo->prepare("SELECT id_programa FROM programas_formacion WHERE id_programa = ?");
                $check->execute([$id_programa]);
                if ($check->fetch()) {
                     $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Programa actualizado (sin cambios)']));
                     return $response->withStatus(200);
                }
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Programa no encontrado']));
                return $response->withStatus(404);
            }
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al obtener jornadas']));
            return $response->withStatus(500);
        }
    });

    // Crear Usuario
    $app->post('/api/usuarios/crear', function ($request, $response) {
        $user = verifyJwtFromHeader($request);
        // Verificar si es admin (ajusta según tu lógica)
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $data = $request->getParsedBody();

        // Validaciones básicas
        if (empty($data['nombre']) || empty($data['apellido']) || empty($data['documento']) || empty($data['correo']) || empty($data['clave']) || empty($data['id_rol'])) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Datos incompletos']));
            return $response->withStatus(400);
        }

        if (strlen($data['documento']) < 6 || strlen($data['documento']) > 15) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'El documento debe tener entre 6 y 15 números']));
            return $response->withStatus(400);
        }

        if (strlen($data['clave']) < 6 || strlen($data['clave']) > 100) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'La contraseña debe tener entre 6 y 100 caracteres']));
            return $response->withStatus(400);
        }

        try {
            $pdo = conexion();

            // 1. Verificar si el documento ya existe
            $stmt = $pdo->prepare("SELECT correo, id_rol FROM usuarios WHERE documento = ?");
            $stmt->execute([$data['documento']]);
            $existing_users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($existing_users)) {
                // El documento existe. Verificar consistencia de correo.
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
            } else {
                // El documento NO existe. Verificar si el correo existe.
                $stmt = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE correo = ?");
                $stmt->execute([$data['correo']]);
                if ($stmt->fetch()) {
                     $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Este correo electrónico ya está registrado con otro documento']));
                     return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
                }
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
            return $response->withStatus(201);
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al crear usuario: ' . $e->getMessage()]));
            return $response->withStatus(500);
        }
    });

    // Buscar Usuarios
    $app->get('/api/usuarios', function ($request, $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $params = $request->getQueryParams();
        $q = $params['q'] ?? '';
        $estado = $params['estado'] ?? '';
        $rol = $params['rol'] ?? '';

        try {
            $pdo = conexion();
            $sql = "SELECT u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.documento, u.correo, u.estado, u.id_rol, r.nombre_rol 
                    FROM usuarios u
                    LEFT JOIN roles r ON u.id_rol = r.id_rol";

            $conditions = [];
            $bindings = [];

            // Filtro de búsqueda por texto
            if (!empty($q)) {
                $conditions[] = "(u.nombre LIKE :q OR u.apellido LIKE :q OR u.documento LIKE :q OR u.correo LIKE :q)";
                $bindings[':q'] = '%' . $q . '%';
            }

            // Filtro por estado
            if (!empty($estado)) {
                $conditions[] = "u.estado = :estado";
                $bindings[':estado'] = $estado;
            }

            // Filtro por rol
            if (!empty($rol)) {
                $conditions[] = "u.id_rol = :rol";
                $bindings[':rol'] = $rol;
            }

            // Agregar condiciones WHERE si existen
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }

            $sql .= " ORDER BY u.id_usuario DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($bindings);

            $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode(['status' => 'ok', 'usuarios' => $usuarios]));
            return $response->withStatus(200);
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al buscar usuarios']));
            return $response->withStatus(500);
        }
    });

    // Obtener Usuario por ID
    $app->get('/api/usuarios/{id}', function ($request, $response, $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $args['id'];

        try {
            $pdo = conexion();
            $stmt = $pdo->prepare("SELECT u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.documento, u.correo, u.estado, u.id_rol, u.id_programa,
                                          p.nombre_programa, p.numero_ficha, p.nivel, p.centro_formacion, p.estado AS estado_programa, j.nombre_jornada
                                   FROM usuarios u
                                   LEFT JOIN programas_formacion p ON u.id_programa = p.id_programa
                                   LEFT JOIN jornadas j ON p.id_jornada = j.id_jornada
                                   WHERE u.id_usuario = ?");
            $stmt->execute([$id_usuario]);
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($usuario) {
                $response->getBody()->write(json_encode(['status' => 'ok', 'usuario' => $usuario]));
                return $response->withStatus(200);
            } else {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']));
                return $response->withStatus(404);
            }
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al obtener usuario']));
            return $response->withStatus(500);
        }
    });

    // Eliminar Usuario
    $app->delete('/api/usuarios/{id}', function ($request, $response, $args) {
        $user = verifyJwtFromHeader($request);
        // Verificar si es admin
        if (!$user || ($user['nombre_rol'] ?? '') !== 'Administrador') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $args['id'];

        try {
            $pdo = conexion();
            $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id_usuario = ?");
            $stmt->execute([$id_usuario]);

            if ($stmt->rowCount() > 0) {
                $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Usuario eliminado']));
                return $response->withStatus(200);
            } else {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']));
                return $response->withStatus(404);
            }
        } catch (Throwable $e) {
            // Manejo de integridad referencial (si el usuario tiene registros asociados)
            if (strpos($e->getMessage(), 'Constraint violation') !== false) {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No se puede eliminar: el usuario tiene registros asociados.']));
                return $response->withStatus(400);
            }
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al eliminar usuario: ' . $e->getMessage()]));
            return $response->withStatus(500);
        }
    });

    // Actualizar Usuario (General)
    $app->put('/api/usuarios/{id}', function ($request, $response, $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $args['id'];
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

            // Verificar duplicados (excluyendo al usuario actual, pero validando por ROL)
            // Permitimos mismo documento/correo si el rol es diferente.
            // Como no actualizamos el rol aquí, usamos el que viene en data (que debería ser el actual).
            $stmt = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE ((documento = ? AND id_rol = ?) OR (correo = ? AND id_rol = ?)) AND id_usuario != ?");
            $stmt->execute([$data['documento'], $data['id_rol'], $data['correo'], $data['id_rol'], $id_usuario]);

            if ($stmt->fetch()) {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'El documento o correo ya está en uso por otro usuario']));
                return $response->withStatus(400);
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
                !empty($data['id_programa']) ? $data['id_programa'] : null
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
    });

    // Actualizar Estado de Usuario
    $app->put('/api/usuarios/{id}/estado', function ($request, $response, $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $args['id'];
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
                    require_once __DIR__ . '/../email/estadocuenta.php';
                    enviarCorreoEstadoCuenta($usuarioDestino['correo'], $usuarioDestino['nombre'], $nuevo_estado);
                }

                $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Estado actualizado y notificación enviada']));
                return $response->withStatus(200);
            } else {
                $check = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = ?");
                $check->execute([$id_usuario]);
                if ($check->fetch()) {
                    $response->getBody()->write(json_encode(['status' => 'ok', 'message' => 'Estado actualizado (sin cambios)']));
                    return $response->withStatus(200);
                }
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']));
                return $response->withStatus(404);
            }
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al actualizar estado']));
            return $response->withStatus(500);
        }
    });

    // Obtener Estadísticas para Dashboard Admin
    $app->get('/api/admin/stats', function ($request, $response) {
        $user = verifyJwtFromHeader($request);
        $allowedRoles = ['Administrador', 'Coordinacion'];
        $userRole = $user['nombre_rol'] ?? '';
        
        if (!$user || !in_array($userRole, $allowedRoles)) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        try {
            $pdo = conexion();
            
            // 1. Usuarios Activos
            $stmtUsers = $pdo->query("SELECT COUNT(*) as count FROM usuarios WHERE TRIM(LOWER(estado)) = 'activo'");
            $activeUsers = $stmtUsers->fetch(PDO::FETCH_ASSOC)['count'];

            // 2. Programas de Formación Activos
            $stmtPrograms = $pdo->query("SELECT COUNT(*) as count FROM programas_formacion WHERE TRIM(LOWER(estado)) = 'activo'");
            $activePrograms = $stmtPrograms->fetch(PDO::FETCH_ASSOC)['count'];

            // 3. Solicitudes Generadas (Tabla permisos)
            $requestsCount = 0;
            try {
                $stmtRequests = $pdo->query("SELECT COUNT(*) as count FROM permisos");
                $requestsCount = $stmtRequests->fetch(PDO::FETCH_ASSOC)['count'];
            } catch (Throwable $e) {
                error_log("Error counting permisos: " . $e->getMessage());
            }

            // 4. Aprendices Registrados
            $stmtApprentices = $pdo->query("SELECT COUNT(*) as count FROM usuarios u 
                                            JOIN roles r ON u.id_rol = r.id_rol 
                                            WHERE TRIM(LOWER(r.nombre_rol)) = 'aprendiz'");
            $apprenticesCount = $stmtApprentices->fetch(PDO::FETCH_ASSOC)['count'];

            // 5. Instructores Registrados
            $stmtInstructors = $pdo->query("SELECT COUNT(*) as count FROM usuarios u 
                                            JOIN roles r ON u.id_rol = r.id_rol 
                                            WHERE TRIM(LOWER(r.nombre_rol)) = 'instructor'");
            $instructorsCount = $stmtInstructors->fetch(PDO::FETCH_ASSOC)['count'];

            // 6. Usuarios Desactivados
            $stmtInactive = $pdo->query("SELECT COUNT(*) as count FROM usuarios WHERE TRIM(LOWER(estado)) = 'inactivo'");
            $inactiveUsers = $stmtInactive->fetch(PDO::FETCH_ASSOC)['count'];

            // 7. Programas Activos
            $stmtProgramasActivos = $pdo->query("SELECT COUNT(*) as count FROM programas_formacion WHERE TRIM(LOWER(estado)) = 'activo'");
            $programasActivos = $stmtProgramasActivos->fetch(PDO::FETCH_ASSOC)['count'];

            // 8. Programas Inactivos
            $stmtProgramasInactivos = $pdo->query("SELECT COUNT(*) as count FROM programas_formacion WHERE TRIM(LOWER(estado)) = 'inactivo'");
            $programasInactivos = $stmtProgramasInactivos->fetch(PDO::FETCH_ASSOC)['count'];

            // 9. Total de Usuarios
            $stmtTotalUsers = $pdo->query("SELECT COUNT(*) as count FROM usuarios");
            $totalUsers = $stmtTotalUsers->fetch(PDO::FETCH_ASSOC)['count'];

            // 10. Total de Programas
            $stmtTotalPrograms = $pdo->query("SELECT COUNT(*) as count FROM programas_formacion");
            $totalPrograms = $stmtTotalPrograms->fetch(PDO::FETCH_ASSOC)['count'];

            // 11. Coordinadores Registrados
            $stmtCoordinadores = $pdo->query("SELECT COUNT(*) as count FROM usuarios u 
                                            JOIN roles r ON u.id_rol = r.id_rol 
                                            WHERE TRIM(LOWER(r.nombre_rol)) = 'coordinacion'");
            $coordinadoresCount = $stmtCoordinadores->fetch(PDO::FETCH_ASSOC)['count'];

            // 12. Vigilantes Registrados
            $stmtVigilantes = $pdo->query("SELECT COUNT(*) as count FROM usuarios u 
                                            JOIN roles r ON u.id_rol = r.id_rol 
                                            WHERE TRIM(LOWER(r.nombre_rol)) = 'vigilante'");
            $vigilantesCount = $stmtVigilantes->fetch(PDO::FETCH_ASSOC)['count'];

            // 13. Administradores Registrados
            $stmtAdministradores = $pdo->query("SELECT COUNT(*) as count FROM usuarios u 
                                            JOIN roles r ON u.id_rol = r.id_rol 
                                            WHERE TRIM(LOWER(r.nombre_rol)) = 'administrador'");
            $administradoresCount = $stmtAdministradores->fetch(PDO::FETCH_ASSOC)['count'];

            $stats = [
                'activeUsers' => $activeUsers,
                'activePrograms' => $activePrograms,
                'totalRequests' => $requestsCount,
                'apprenticesCount' => $apprenticesCount,
                'instructorsCount' => $instructorsCount,
                'inactiveUsers' => $inactiveUsers,
                'programasActivos' => $programasActivos,
                'programasInactivos' => $programasInactivos,
                'totalUsers' => $totalUsers,
                'totalPrograms' => $totalPrograms,
                'coordinadoresCount' => $coordinadoresCount,
                'vigilantesCount' => $vigilantesCount,
                'administradoresCount' => $administradoresCount
            ];

            $response->getBody()->write(json_encode(['status' => 'ok', 'stats' => $stats]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/admin/stats: " . $e->getMessage());
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al obtener estadísticas: ' . $e->getMessage()]));
            return $response->withStatus(500);
        }
    });
};
