<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function ($app) {
    
    // ====================================================================
    // GET /api/instructor/solicitudes-pendientes
    // Obtiene las solicitudes pendientes de aprobación del coordinador
    // ====================================================================
    $app->get('/api/instructor/solicitudes-pendientes', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        // Verificar que sea instructor o coordinador
        $rol = strtolower($user['nombre_rol'] ?? '');
        if (!in_array($rol, ['instructor', 'coordinador', 'coordinacion'])) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores y coordinadores']));
            return $response->withStatus(403);
        }

        try {
            $pdo = conexion();
            
            // Query para obtener solicitudes pendientes del instructor
            $id_instructor = $user['sub'];
            $sql = "
                SELECT 
                    P.id_permiso,
                    P.motivo,
                    P.descripcion AS motivo_otros,
                    P.hora_salida,
                    P.hora_regreso,
                    P.hora_regreso,
                    P.fecha_solicitud,
                    P.soporte,
                    -- Datos del Aprendiz
                    U_APZ.nombre AS nombre_aprendiz,
                    U_APZ.apellido AS apellido_aprendiz,
                    U_APZ.documento AS documento_aprendiz,
                    -- Datos de Formación
                    PF.nombre_programa,
                    PF.numero_ficha,
                    PF.nivel,
                    PF.centro_formacion,
                    -- Datos de Jornada
                    J.nombre_jornada
                FROM
                    permisos P
                INNER JOIN
                    usuarios U_APZ ON P.id_usuario = U_APZ.id_usuario
                LEFT JOIN
                    programas_formacion PF ON U_APZ.id_programa = PF.id_programa
                LEFT JOIN
                    jornadas J ON PF.id_jornada = J.id_jornada
                WHERE
                    P.estado_general = 'Pendiente Instructor'
                    AND P.id_instructor_destino = :id_instructor
                ORDER BY
                    P.fecha_solicitud DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_instructor' => $id_instructor]);
            $solicitudes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'solicitudes' => $solicitudes
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/instructor/solicitudes-pendientes: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al obtener solicitudes'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // POST /api/instructor/aprobar
    // Aprueba una solicitud del instructor y la envía a coordinación
    // ====================================================================
    $app->post('/api/instructor/aprobar', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        // Verificar que sea instructor
        $rol = strtolower($user['nombre_rol'] ?? '');
        if ($rol !== 'instructor') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores']));
            return $response->withStatus(403);
        }

        $id_instructor = $user['sub'] ?? null;
        if (!$id_instructor) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Token inválido']));
            return $response->withStatus(401);
        }

        $data = $request->getParsedBody();
        $id_permiso = $data['id_permiso'] ?? 0;

        if ($id_permiso <= 0) {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'ID de permiso inválido'
            ]));
            return $response->withStatus(400);
        }

        try {
            $pdo = conexion();
            
            // Verificar que el permiso esté en estado "Pendiente Instructor"
            $sqlEstado = "SELECT estado_general FROM permisos WHERE id_permiso = :id_permiso";
            $stmtEstado = $pdo->prepare($sqlEstado);
            $stmtEstado->execute([':id_permiso' => $id_permiso]);
            $estado = $stmtEstado->fetchColumn();
            
            if ($estado !== 'Pendiente Instructor') {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Esta solicitud ya fue procesada'
                ]));
                return $response->withStatus(400);
            }
            
            // Insertar aprobación del instructor
            $sql_aprobacion = "
                INSERT INTO aprobaciones 
                (id_permiso, id_usuario_aprobador, rol_aprobador, estado_aprobacion, observaciones) 
                VALUES 
                (:id_permiso, :id_instructor, 'Instructor', 'Aprobado', 'Aprobado por instructor')
            ";
            
            $stmt = $pdo->prepare($sql_aprobacion);
            $stmt->execute([
                ':id_permiso' => $id_permiso,
                ':id_instructor' => $id_instructor
            ]);

            // Actualizar estado del permiso a Pendiente Coordinador
            $sql_permiso = "
                UPDATE permisos 
                SET estado_general = 'Pendiente Coordinador' 
                WHERE id_permiso = :id_permiso
            ";
            
            $stmt_permiso = $pdo->prepare($sql_permiso);
            $stmt_permiso->execute([':id_permiso' => $id_permiso]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Solicitud aprobada y enviada a coordinación'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/instructor/aprobar: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al aprobar solicitud'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // POST /api/instructor/rechazar
    // Rechaza una solicitud del instructor con motivo
    // ====================================================================
    $app->post('/api/instructor/rechazar', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        // Verificar que sea instructor
        $rol = strtolower($user['nombre_rol'] ?? '');
        if ($rol !== 'instructor') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores']));
            return $response->withStatus(403);
        }

        $id_instructor = $user['sub'] ?? null;
        if (!$id_instructor) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Token inválido']));
            return $response->withStatus(401);
        }

        $data = $request->getParsedBody();
        $id_permiso = $data['id_permiso'] ?? 0;
        $motivo_rechazo = $data['motivo_rechazo'] ?? '';

        if ($id_permiso <= 0 || trim($motivo_rechazo) === '') {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Datos incompletos'
            ]));
            return $response->withStatus(400);
        }

        try {
            $pdo = conexion();
            
            // Insertar rechazo del instructor con motivo real
            $sql_aprobacion = "
                INSERT INTO aprobaciones 
                (id_permiso, id_usuario_aprobador, rol_aprobador, estado_aprobacion, motivo, observaciones) 
                VALUES 
                (:id_permiso, :id_instructor, 'Instructor', 'Rechazado', :motivo, :motivo)
            ";
            
            $stmt = $pdo->prepare($sql_aprobacion);
            $stmt->execute([
                ':id_permiso' => $id_permiso,
                ':id_instructor' => $id_instructor,
                ':motivo' => $motivo_rechazo
            ]);

            // Actualizar estado del permiso a Rechazado
            $sql_permiso = "
                UPDATE permisos 
                SET estado_general = 'Rechazado' 
                WHERE id_permiso = :id_permiso
            ";
            
            $stmt_permiso = $pdo->prepare($sql_permiso);
            $stmt_permiso->execute([':id_permiso' => $id_permiso]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Solicitud rechazada'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/instructor/rechazar: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al rechazar solicitud'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // GET /api/instructor/historial
    // Obtiene todas las solicitudes procesadas del instructor (no ocultas)
    // ====================================================================
    $app->get('/api/instructor/historial', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $rol = strtolower($user['nombre_rol'] ?? '');
        if ($rol !== 'instructor') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores']));
            return $response->withStatus(403);
        }

        $id_instructor = $user['sub'];

        // Obtener parámetros de filtro
        $params = $request->getQueryParams();
        $documento = $params['documento'] ?? '';
        $fecha = $params['fecha'] ?? '';

        try {
            $pdo = conexion();
            
            // Obtener todas las solicitudes del instructor que no estén ocultas
            $sql = "
                SELECT 
                    p.id_permiso,
                    p.fecha_solicitud,
                    DATE_FORMAT(p.fecha_solicitud, '%d/%m/%Y') AS fecha_solicitud_formato,
                    p.motivo,
                    p.descripcion,
                    p.hora_salida,
                    p.hora_regreso,
                    p.soporte,
                    p.estado_general,
                    u_apz.nombre AS nombre_aprendiz,
                    u_apz.apellido AS apellido_aprendiz,
                    u_apz.documento AS documento_aprendiz,
                    pf.nombre_programa,
                    pf.numero_ficha,
                    MAX(CASE WHEN a.rol_aprobador = 'Coordinacion' THEN a.qr ELSE NULL END) AS qr,
                    MAX(CASE WHEN a.rol_aprobador = 'Instructor' AND a.estado_aprobacion = 'Rechazado' THEN a.motivo ELSE NULL END) AS motivo_rechazo_instructor,
                    MAX(CASE WHEN a.rol_aprobador = 'Coordinacion' AND a.estado_aprobacion = 'Rechazado' THEN a.motivo ELSE NULL END) AS motivo_rechazo_coordinador,
                    'Aprobado' AS estado_instructor,
                    MAX(CASE WHEN a.rol_aprobador = 'Coordinacion' THEN a.estado_aprobacion ELSE NULL END) AS estado_coordinador
                FROM 
                    permisos p
                INNER JOIN 
                    usuarios u_apz ON p.id_usuario = u_apz.id_usuario
                LEFT JOIN 
                    programas_formacion pf ON u_apz.id_programa = pf.id_programa
                LEFT JOIN 
                    aprobaciones a ON p.id_permiso = a.id_permiso
                WHERE 
                    p.id_instructor_destino = :id_instructor
                    AND p.oculto_instructor = 0
                    AND p.estado_general != 'Pendiente Instructor'
            ";

            // Agregar filtros dinámicos
            $sqlParams = [':id_instructor' => $id_instructor];
            
            if (!empty($documento)) {
                $sql .= " AND u_apz.documento LIKE :documento";
                $sqlParams[':documento'] = "%{$documento}%";
            }
            
            if (!empty($fecha)) {
                $sql .= " AND DATE(p.fecha_solicitud) = :fecha";
                $sqlParams[':fecha'] = $fecha;
            }

            $sql .= "
                GROUP BY
                    p.id_permiso, p.fecha_solicitud, p.motivo, p.descripcion, p.hora_salida, p.hora_regreso, p.soporte, p.estado_general,
                    u_apz.nombre, u_apz.apellido, u_apz.documento, pf.nombre_programa, pf.numero_ficha
                ORDER BY 
                    p.fecha_solicitud DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($sqlParams);
            $solicitudes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Procesar estado_display
            foreach ($solicitudes as &$solicitud) {
                if (!empty($solicitud['qr'])) {
                    $solicitud['estado_display'] = 'Aprobado QR Generado';
                } else {
                    $solicitud['estado_display'] = $solicitud['estado_general'];
                }
            }

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'solicitudes' => $solicitudes
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/instructor/historial: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al obtener historial'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // DELETE /api/instructor/historial
    // Soft delete de todas las solicitudes procesadas (aprobadas/rechazadas)
    // NO elimina las pendientes
    // ====================================================================
    $app->delete('/api/instructor/historial', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $rol = strtolower($user['nombre_rol'] ?? '');
        if ($rol !== 'instructor') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores']));
            return $response->withStatus(403);
        }

        $id_instructor = $user['sub'];

        try {
            $pdo = conexion();
            
            // Soft Delete: Actualizar oculto_instructor = 1 pero SOLO si NO está pendiente
            $sql = "UPDATE permisos 
                    SET oculto_instructor = 1 
                    WHERE id_instructor_destino = :id_instructor 
                    AND estado_general != 'Pendiente Instructor'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_instructor' => $id_instructor]);
            
            $affected = $stmt->rowCount();

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => "Se ocultaron $affected solicitudes procesadas",
                'affected' => $affected
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en DELETE /api/instructor/historial: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al eliminar historial'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // DELETE /api/instructor/solicitud/{id}
    // Soft delete de una solicitud específica (solo si está procesada)
    // ====================================================================
    $app->delete('/api/instructor/solicitud/{id}', function (Request $request, Response $response, $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $rol = strtolower($user['nombre_rol'] ?? '');
        if ($rol !== 'instructor') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores']));
            return $response->withStatus(403);
        }

        $id_instructor = $user['sub'];
        $id_permiso = $args['id'] ?? 0;

        if ($id_permiso <= 0) {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'ID de permiso inválido'
            ]));
            return $response->withStatus(400);
        }

        try {
            $pdo = conexion();
            
            // Verificar que la solicitud pertenezca al instructor y no esté pendiente
            $sqlCheck = "SELECT estado_general FROM permisos 
                        WHERE id_permiso = :id_permiso 
                        AND id_instructor_destino = :id_instructor";
            $stmtCheck = $pdo->prepare($sqlCheck);
            $stmtCheck->execute([
                ':id_permiso' => $id_permiso,
                ':id_instructor' => $id_instructor
            ]);
            $estado = $stmtCheck->fetchColumn();

            if (!$estado) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Solicitud no encontrada'
                ]));
                return $response->withStatus(404);
            }

            if ($estado === 'Pendiente Instructor') {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'No se pueden eliminar solicitudes pendientes'
                ]));
                return $response->withStatus(400);
            }

            // Soft Delete
            $sql = "UPDATE permisos 
                    SET oculto_instructor = 1 
                    WHERE id_permiso = :id_permiso";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_permiso' => $id_permiso]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Solicitud eliminada del historial'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en DELETE /api/instructor/solicitud/{id}: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al eliminar solicitud'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // GET /api/instructor/perfil
    // Obtiene los datos del perfil del instructor
    // ====================================================================
    $app->get('/api/instructor/perfil', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $rol = strtolower($user['nombre_rol'] ?? '');
        if ($rol !== 'instructor') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores']));
            return $response->withStatus(403);
        }

        $id_usuario = $user['sub'];

        try {
            $pdo = conexion();
            
            $sql = "SELECT 
                        u.nombre,
                        u.apellido,
                        u.tipo_documento,
                        u.documento,
                        u.correo,
                        r.nombre_rol
                    FROM usuarios u
                    INNER JOIN roles r ON u.id_rol = r.id_rol
                    WHERE u.id_usuario = :id_usuario";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_usuario' => $id_usuario]);
            $perfil = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$perfil) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Perfil no encontrado'
                ]));
                return $response->withStatus(404);
            }

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'perfil' => $perfil
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/instructor/perfil: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al obtener perfil'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // PUT /api/instructor/actualizar-correo
    // Actualiza el correo electrónico del instructor
    // ====================================================================
    $app->put('/api/instructor/actualizar-correo', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $rol = strtolower($user['nombre_rol'] ?? '');
        if ($rol !== 'instructor') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores']));
            return $response->withStatus(403);
        }

        $id_usuario = $user['sub'];
        $data = $request->getParsedBody();
        $nuevo_correo = $data['nuevo_correo'] ?? '';

        if (empty($nuevo_correo)) {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'El correo es requerido'
            ]));
            return $response->withStatus(400);
        }

        // Validar formato de correo
        if (!filter_var($nuevo_correo, FILTER_VALIDATE_EMAIL)) {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Formato de correo inválido'
            ]));
            return $response->withStatus(400);
        }

        try {
            $pdo = conexion();
            
            // Verificar que el correo no esté en uso por otro usuario
            $sqlCheck = "SELECT id_usuario FROM usuarios WHERE correo = :correo AND id_usuario != :id_usuario";
            $stmtCheck = $pdo->prepare($sqlCheck);
            $stmtCheck->execute([
                ':correo' => $nuevo_correo,
                ':id_usuario' => $id_usuario
            ]);
            
            if ($stmtCheck->fetch()) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Este correo ya está en uso'
                ]));
                return $response->withStatus(400);
            }

            // Actualizar correo
            $sql = "UPDATE usuarios SET correo = :correo WHERE id_usuario = :id_usuario";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':correo' => $nuevo_correo,
                ':id_usuario' => $id_usuario
            ]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Correo actualizado exitosamente'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/instructor/actualizar-correo: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al actualizar correo'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // PUT /api/instructor/cambiar-contrasena
    // Cambia la contraseña del instructor
    // ====================================================================
    $app->put('/api/instructor/cambiar-contrasena', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $rol = strtolower($user['nombre_rol'] ?? '');
        if ($rol !== 'instructor') {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo instructores']));
            return $response->withStatus(403);
        }

        $id_usuario = $user['sub'];
        $data = $request->getParsedBody();
        $contrasena_actual = $data['contrasena_actual'] ?? '';
        $contrasena_nueva = $data['contrasena_nueva'] ?? '';

        if (empty($contrasena_actual) || empty($contrasena_nueva)) {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Todos los campos son requeridos'
            ]));
            return $response->withStatus(400);
        }

        try {
            $pdo = conexion();
            
            // Verificar contraseña actual
            $sqlCheck = "SELECT contrasena FROM usuarios WHERE id_usuario = :id_usuario";
            $stmtCheck = $pdo->prepare($sqlCheck);
            $stmtCheck->execute([':id_usuario' => $id_usuario]);
            $hash_actual = $stmtCheck->fetchColumn();

            if (!password_verify($contrasena_actual, $hash_actual)) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'La contraseña actual es incorrecta'
                ]));
                return $response->withStatus(400);
            }

            // Actualizar contraseña
            $hash_nueva = password_hash($contrasena_nueva, PASSWORD_BCRYPT);
            $sql = "UPDATE usuarios SET contrasena = :contrasena WHERE id_usuario = :id_usuario";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':contrasena' => $hash_nueva,
                ':id_usuario' => $id_usuario
            ]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Contraseña actualizada exitosamente'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/instructor/cambiar-contrasena: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al cambiar contraseña'
            ]));
            return $response->withStatus(500);
        }
    });
};
