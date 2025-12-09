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

            // --- INICIO INTEGRACIÓN CORREO (APROBACIÓN INSTRUCTOR) ---

            // 1. Obtener datos completos de la solicitud, aprendiz e instructor
            $stmtData = $pdo->prepare("
                SELECT 
                    p.motivo, p.descripcion,
                    u_apz.correo AS correo_aprendiz, u_apz.nombre AS nombre_aprendiz, u_apz.apellido AS apellido_aprendiz, u_apz.documento AS documento_aprendiz,
                    pf.nombre_programa, pf.numero_ficha, j.nombre_jornada,
                    u_inst.nombre AS nombre_instructor, u_inst.apellido AS apellido_instructor, u_inst.documento AS documento_instructor
                FROM permisos p
                INNER JOIN usuarios u_apz ON p.id_usuario = u_apz.id_usuario
                LEFT JOIN programas_formacion pf ON u_apz.id_programa = pf.id_programa
                LEFT JOIN jornadas j ON pf.id_jornada = j.id_jornada
                INNER JOIN usuarios u_inst ON p.id_instructor_destino = u_inst.id_usuario
                WHERE p.id_permiso = ?
            ");
            $stmtData->execute([$id_permiso]);
            $dataPermiso = $stmtData->fetch(PDO::FETCH_ASSOC);

            if ($dataPermiso) {

                try {
                    // Usar 'correo' o 'email' dependiendo del campo en la BD, aquí usaremos 'correo' que es lo estándar en este sistema
                    $emailAprendiz = $dataPermiso['correo_aprendiz'] ?? null;
                    $nombreAprendizCompleto = $dataPermiso['nombre_aprendiz'] . ' ' . $dataPermiso['apellido_aprendiz'];
                    $nombreInstructorCompleto = $dataPermiso['nombre_instructor'] . ' ' . $dataPermiso['apellido_instructor'];
                    $descripcionSolicitud = !empty($dataPermiso['descripcion']) ? $dataPermiso['descripcion'] : $dataPermiso['motivo'];

                    // A. Notificar al APRENDIZ (Aprobado por Instructor)
                    require_once __DIR__ . '/../email/solicitud/notificaraprendiz.php';
                    if (!empty($emailAprendiz)) {

                        enviarCorreoAprendiz($emailAprendiz, $nombreAprendizCompleto, 'INSTRUCTOR', 'Aprobada', $descripcionSolicitud);

                    }

                    // B. Notificar a TODOS los COORDINADORES activos
                    // Buscar correos de coordinación (Rol 'Coordinacion' o 'Coordinador')
                    $stmtCoord = $pdo->query("
                        SELECT correo FROM usuarios 
                        JOIN roles ON usuarios.id_rol = roles.id_rol 
                        WHERE LOWER(roles.nombre_rol) IN ('coordinacion', 'coordinador') AND usuarios.estado = 'Activo' 
                    ");
                    $coordinadores = $stmtCoord->fetchAll(PDO::FETCH_COLUMN);

                    if ($coordinadores) {
                        require_once __DIR__ . '/../email/solicitud/notificarcoordinacion.php';
                        foreach ($coordinadores as $emailCoordinacion) {
                            if (!empty($emailCoordinacion)) {

                                enviarCorreoCoordinacion(
                                    $emailCoordinacion,
                                    $nombreAprendizCompleto,
                                    $dataPermiso['documento_aprendiz'],
                                    $dataPermiso['nombre_programa'] ?? 'N/A',
                                    $dataPermiso['numero_ficha'] ?? 'N/A',
                                    $dataPermiso['nombre_jornada'] ?? 'N/A',
                                    $nombreInstructorCompleto,
                                    $dataPermiso['documento_instructor'],
                                    $descripcionSolicitud
                                );
                            }
                        }

                    }
                } catch (Throwable $e) {

                    error_log("Error enviando correos instructor (aprobacion): " . $e->getMessage());
                }
            }
            // --- FIN INTEGRACIÓN CORREO ---

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

            // --- INICIO INTEGRACIÓN CORREO (RECHAZO INSTRUCTOR) ---
            // Obtener datos del aprendiz para notificar
            $stmtData = $pdo->prepare("
                SELECT u.correo, u.nombre, u.apellido, p.motivo, p.descripcion
                FROM permisos p
                INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
                WHERE p.id_permiso = ?
            ");
            $stmtData->execute([$id_permiso]);
            $dataAprendiz = $stmtData->fetch(PDO::FETCH_ASSOC);

            if ($dataAprendiz && !empty($dataAprendiz['correo'])) {
                try {
                    require_once __DIR__ . '/../email/solicitud/notificaraprendiz.php';
                    $nombreCompleto = $dataAprendiz['nombre'] . ' ' . $dataAprendiz['apellido'];
                    $descripcionSolicitud = !empty($dataAprendiz['descripcion']) ? $dataAprendiz['descripcion'] : $dataAprendiz['motivo'];
                    
                    enviarCorreoAprendiz(
                        $dataAprendiz['correo'], 
                        $nombreCompleto, 
                        'INSTRUCTOR', 
                        'Rechazada',
                        $descripcionSolicitud,
                        $motivo_rechazo
                    );
                } catch (Throwable $e) {
                    error_log("Error enviando correo instructor (rechazo): " . $e->getMessage());
                }
            }
            // --- FIN INTEGRACIÓN CORREO ---

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
                    (SELECT COUNT(*) 
                     FROM accesos acc 
                     JOIN aprobaciones ap ON acc.id_aprobacion = ap.id_aprobacion 
                     WHERE ap.id_permiso = p.id_permiso AND ap.rol_aprobador = 'Coordinacion') as veces_escaneado,
                    MAX(CASE WHEN a.rol_aprobador = 'Instructor' AND a.estado_aprobacion = 'Rechazado' THEN a.motivo ELSE NULL END) AS motivo_rechazo_instructor,
                    
                    -- Subconsultas explícitas para datos de Coordinación (Rechazo/Aprobación)
                    (SELECT COALESCE(observaciones, motivo) FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Coordinacion' AND estado_aprobacion = 'Rechazado' ORDER BY fecha_aprobacion DESC LIMIT 1) AS motivo_rechazo_coordinador,
                    
                    'Aprobado' AS estado_instructor,
                    (SELECT estado_aprobacion FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Coordinacion' ORDER BY fecha_aprobacion DESC LIMIT 1) AS estado_coordinador,
                    
                    -- Datos Coordinador (Generico - intenta tomar el más reciente de coordinacion)
                    (SELECT u_c.nombre FROM aprobaciones ap_c JOIN usuarios u_c ON ap_c.id_usuario_aprobador = u_c.id_usuario WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' ORDER BY ap_c.fecha_aprobacion DESC LIMIT 1) AS nombre_coordinador,
                    (SELECT u_c.apellido FROM aprobaciones ap_c JOIN usuarios u_c ON ap_c.id_usuario_aprobador = u_c.id_usuario WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' ORDER BY ap_c.fecha_aprobacion DESC LIMIT 1) AS apellido_coordinador,
                    (SELECT u_c.documento FROM aprobaciones ap_c JOIN usuarios u_c ON ap_c.id_usuario_aprobador = u_c.id_usuario WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' ORDER BY ap_c.fecha_aprobacion DESC LIMIT 1) AS documento_coordinador
                FROM 
                    permisos p
                INNER JOIN 
                    usuarios u_apz ON p.id_usuario = u_apz.id_usuario
                LEFT JOIN 
                    programas_formacion pf ON u_apz.id_programa = pf.id_programa
                LEFT JOIN 
                    aprobaciones a ON p.id_permiso = a.id_permiso
                LEFT JOIN
                    usuarios u_app ON a.id_usuario_aprobador = u_app.id_usuario
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
                if ($solicitud['veces_escaneado'] > 0) {
                    $solicitud['estado_display'] = 'Ya Escaneado';
                } elseif (!empty($solicitud['qr'])) {
                    $solicitud['estado_display'] = 'Aprobado';
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
