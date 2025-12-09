<?php
// ====================================================================
// Archivo: backend/aprendiz/routes.php
// Rutas API para el módulo de Aprendiz
// ====================================================================

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function ($app) {
    
    // ====================================================================
    // GET /api/aprendiz/solicitudes-hoy
    // Obtiene las solicitudes del día actual del aprendiz autenticado
    // ====================================================================
    // ====================================================================
    // GET /api/aprendiz/solicitudes-hoy
    // Obtiene las solicitudes del día actual del aprendiz autenticado
    // ====================================================================
    $app->get('/api/aprendiz/solicitudes-hoy', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        // Verificar que sea aprendiz
        if (strcasecmp($user['nombre_rol'] ?? '', 'Aprendiz') !== 0) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Acceso denegado. Solo para aprendices.']));
            return $response->withStatus(403);
        }

        // El JWT guarda el id_usuario en el campo 'sub'
        if (!isset($user['sub'])) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Token inválido: falta sub']));
            return $response->withStatus(401);
        }

        $id_usuario = $user['sub'];

        try {
            $pdo = conexion();
            
            // Consulta SQL para obtener los permisos de HOY del usuario (sin duplicados)
            // Se une con la tabla usuarios para obtener datos del instructor
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
                    u_inst.nombre AS nombre_instructor,
                    u_inst.apellido AS apellido_instructor,
                    u_inst.documento AS documento_instructor,
                    MAX(CASE WHEN a.rol_aprobador = 'Coordinacion' THEN a.qr ELSE NULL END) AS qr,
                    -- Estados individuales
                    (SELECT estado_aprobacion FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Instructor' ORDER BY fecha_aprobacion DESC LIMIT 1) AS estado_instructor,
                    (SELECT COALESCE(observaciones, motivo) FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Instructor' AND estado_aprobacion = 'Rechazado' ORDER BY fecha_aprobacion DESC LIMIT 1) AS motivo_rechazo_instructor,
                    (SELECT estado_aprobacion FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Coordinacion' ORDER BY fecha_aprobacion DESC LIMIT 1) AS estado_coordinador,
                    (SELECT COALESCE(observaciones, motivo) FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Coordinacion' AND estado_aprobacion = 'Rechazado' ORDER BY fecha_aprobacion DESC LIMIT 1) AS motivo_rechazo_coordinador,
                    -- Información de rechazo
                    -- Información de rechazo
                    (SELECT COALESCE(a_rech.observaciones, a_rech.motivo)
                     FROM aprobaciones a_rech 
                     WHERE a_rech.id_permiso = p.id_permiso AND a_rech.estado_aprobacion = 'Rechazado' 
                     ORDER BY a_rech.fecha_aprobacion DESC LIMIT 1) AS observacion_rechazo,
                    (SELECT a_rech.rol_aprobador 
                     FROM aprobaciones a_rech 
                     WHERE a_rech.id_permiso = p.id_permiso AND a_rech.estado_aprobacion = 'Rechazado' 
                     ORDER BY a_rech.fecha_aprobacion DESC LIMIT 1) AS rol_rechazo,
                    -- Datos Coordinador (Aprobación)
                    (SELECT u_coord.nombre 
                     FROM aprobaciones ap_c 
                     JOIN usuarios u_coord ON ap_c.id_usuario_aprobador = u_coord.id_usuario 
                     WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' AND ap_c.estado_aprobacion = 'Aprobado' LIMIT 1) AS nombre_coordinador_aprobado,
                    (SELECT u_coord.apellido 
                     FROM aprobaciones ap_c 
                     JOIN usuarios u_coord ON ap_c.id_usuario_aprobador = u_coord.id_usuario 
                     WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' AND ap_c.estado_aprobacion = 'Aprobado' LIMIT 1) AS apellido_coordinador_aprobado,
                    (SELECT u_coord.documento 
                     FROM aprobaciones ap_c 
                     JOIN usuarios u_coord ON ap_c.id_usuario_aprobador = u_coord.id_usuario 
                     WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' AND ap_c.estado_aprobacion = 'Aprobado' LIMIT 1) AS documento_coordinador_aprobado,
                    -- Datos Coordinador (Rechazo)
                    (SELECT u_coord.nombre 
                     FROM aprobaciones ap_c 
                     JOIN usuarios u_coord ON ap_c.id_usuario_aprobador = u_coord.id_usuario 
                     WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' AND ap_c.estado_aprobacion = 'Rechazado' LIMIT 1) AS nombre_coordinador_rechazado,
                    (SELECT u_coord.documento 
                     FROM aprobaciones ap_c 
                     JOIN usuarios u_coord ON ap_c.id_usuario_aprobador = u_coord.id_usuario 
                     WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' AND ap_c.estado_aprobacion = 'Rechazado' LIMIT 1) AS documento_coordinador_rechazado,
                    -- Verificación de escaneo
                    (SELECT COUNT(*) 
                     FROM accesos acc 
                     JOIN aprobaciones ap ON acc.id_aprobacion = ap.id_aprobacion 
                     WHERE ap.id_permiso = p.id_permiso AND ap.rol_aprobador = 'Coordinacion') AS veces_escaneado
                FROM 
                    permisos p
                LEFT JOIN 
                    aprobaciones a ON p.id_permiso = a.id_permiso AND a.estado_aprobacion = 'Aprobado'
                LEFT JOIN
                    usuarios u_inst ON p.id_instructor_destino = u_inst.id_usuario
                WHERE 
                    p.id_usuario = :id_usuario AND 
                    DATE(p.fecha_solicitud) = CURDATE() AND
                    p.oculto_aprendiz = 0
                GROUP BY
                    p.id_permiso, p.fecha_solicitud, p.motivo, p.descripcion, p.hora_salida, p.hora_regreso, p.soporte, p.estado_general, u_inst.nombre, u_inst.apellido, u_inst.documento
                ORDER BY 
                    p.fecha_solicitud DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_usuario' => $id_usuario]);
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
            error_log("Error en /api/aprendiz/solicitudes-hoy: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al obtener solicitudes'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // GET /api/aprendiz/historial
    // Obtiene TODAS las solicitudes del aprendiz autenticado (que no estén ocultas)
    // ====================================================================
    $app->get('/api/aprendiz/historial', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $user['sub'];

        try {
            $pdo = conexion();
            
            $sql = "
                SELECT 
                    p.id_permiso,
                    p.fecha_solicitud,
                    DATE_FORMAT(p.fecha_solicitud, '%d/%m/%Y %H:%i') AS fecha_formato,
                    p.motivo,
                    p.descripcion,
                    p.hora_salida,
                    p.hora_regreso,
                    p.soporte,
                    p.estado_general,
                    u_inst.nombre AS nombre_instructor,
                    u_inst.apellido AS apellido_instructor,
                    u_inst.documento AS documento_instructor,
                    MAX(CASE WHEN a.rol_aprobador = 'Coordinacion' THEN a.qr ELSE NULL END) AS qr,
                    -- Estados individuales
                    (SELECT estado_aprobacion FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Instructor' ORDER BY fecha_aprobacion DESC LIMIT 1) AS estado_instructor,
                    (SELECT COALESCE(observaciones, motivo) FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Instructor' AND estado_aprobacion = 'Rechazado' ORDER BY fecha_aprobacion DESC LIMIT 1) AS motivo_rechazo_instructor,
                    (SELECT estado_aprobacion FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Coordinacion' ORDER BY fecha_aprobacion DESC LIMIT 1) AS estado_coordinador,
                    (SELECT COALESCE(observaciones, motivo) FROM aprobaciones WHERE id_permiso = p.id_permiso AND rol_aprobador = 'Coordinacion' AND estado_aprobacion = 'Rechazado' ORDER BY fecha_aprobacion DESC LIMIT 1) AS motivo_rechazo_coordinador,
                    -- Información de rechazo
                    (SELECT COALESCE(a_rech.observaciones, a_rech.motivo)
                     FROM aprobaciones a_rech 
                     WHERE a_rech.id_permiso = p.id_permiso AND a_rech.estado_aprobacion = 'Rechazado' 
                     ORDER BY a_rech.fecha_aprobacion DESC LIMIT 1) AS observacion_rechazo,
                    (SELECT a_rech.rol_aprobador 
                     FROM aprobaciones a_rech 
                     WHERE a_rech.id_permiso = p.id_permiso AND a_rech.estado_aprobacion = 'Rechazado' 
                     ORDER BY a_rech.fecha_aprobacion DESC LIMIT 1) AS rol_rechazo,
                     
                    -- DATOS COORDINADOR RECHAZO (Explicit Subqueries)
                    (SELECT u_c.nombre 
                     FROM aprobaciones ap_c 
                     JOIN usuarios u_c ON ap_c.id_usuario_aprobador = u_c.id_usuario 
                     WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' AND ap_c.estado_aprobacion = 'Rechazado' LIMIT 1) AS nombre_coordinador_rechazado,
                    (SELECT u_c.apellido 
                     FROM aprobaciones ap_c 
                     JOIN usuarios u_c ON ap_c.id_usuario_aprobador = u_c.id_usuario 
                     WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' AND ap_c.estado_aprobacion = 'Rechazado' LIMIT 1) AS apellido_coordinador_rechazado,
                    (SELECT u_c.documento 
                     FROM aprobaciones ap_c 
                     JOIN usuarios u_c ON ap_c.id_usuario_aprobador = u_c.id_usuario 
                     WHERE ap_c.id_permiso = p.id_permiso AND ap_c.rol_aprobador = 'Coordinacion' AND ap_c.estado_aprobacion = 'Rechazado' LIMIT 1) AS documento_coordinador_rechazado,

                    -- Verificación de escaneo
                    (SELECT COUNT(*) 
                     FROM accesos acc 
                     JOIN aprobaciones ap ON acc.id_aprobacion = ap.id_aprobacion 
                     WHERE ap.id_permiso = p.id_permiso AND ap.rol_aprobador = 'Coordinacion') AS veces_escaneado
                FROM 
                    permisos p
                LEFT JOIN 
                    aprobaciones a ON p.id_permiso = a.id_permiso AND a.estado_aprobacion = 'Aprobado'
                LEFT JOIN
                    usuarios u_inst ON p.id_instructor_destino = u_inst.id_usuario
                WHERE 
                    p.id_usuario = :id_usuario AND p.oculto_aprendiz = 0
                GROUP BY
                    p.id_permiso, p.fecha_solicitud, p.motivo, p.descripcion, p.hora_salida, p.hora_regreso, p.soporte, p.estado_general, u_inst.nombre, u_inst.apellido, u_inst.documento
                ORDER BY 
                    p.fecha_solicitud DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_usuario' => $id_usuario]);
            $solicitudes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Procesar estado_display y formatear datos extra
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
            error_log("Error en /api/aprendiz/historial: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al obtener historial'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // DELETE /api/aprendiz/historial
    // Oculta (Soft Delete) TODAS las solicitudes del aprendiz autenticado
    // ====================================================================
    $app->delete('/api/aprendiz/historial', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $user['sub'];

        try {
            $pdo = conexion();
            
            // Soft Delete: Actualizar oculto_aprendiz = 1 pero SOLO si NO está pendiente
            $sql = "UPDATE permisos 
                    SET oculto_aprendiz = 1 
                    WHERE id_usuario = :id_usuario 
                    AND estado_general NOT LIKE '%Pendiente%'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_usuario' => $id_usuario]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Historial eliminado correctamente'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en DELETE /api/aprendiz/historial: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al eliminar historial'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // DELETE /api/aprendiz/solicitud/{id}
    // Oculta (Soft Delete) UNA solicitud específica del aprendiz autenticado
    // ====================================================================
    $app->delete('/api/aprendiz/solicitud/{id}', function (Request $request, Response $response, $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $user['sub'];
        $id_permiso = $args['id'];

        try {
            $pdo = conexion();

            // Verificar que la solicitud pertenezca al usuario
            $sqlCheck = "SELECT id_permiso FROM permisos WHERE id_permiso = :id_permiso AND id_usuario = :id_usuario";
            $stmtCheck = $pdo->prepare($sqlCheck);
            $stmtCheck->execute([':id_permiso' => $id_permiso, ':id_usuario' => $id_usuario]);
            
            if (!$stmtCheck->fetch()) {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solicitud no encontrada o no autorizada']));
                return $response->withStatus(404);
            }
            
            // Soft Delete: Actualizar oculto_aprendiz = 1
            $sql = "UPDATE permisos SET oculto_aprendiz = 1 WHERE id_permiso = :id_permiso";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_permiso' => $id_permiso]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Solicitud eliminada correctamente'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en DELETE /api/aprendiz/solicitud/{id}: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al eliminar la solicitud'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // PUT /api/aprendiz/solicitud/{id}/cancelar
    // Cancela una solicitud (cambia estado a 'Cancelada')
    // ====================================================================
    $app->put('/api/aprendiz/solicitud/{id}/cancelar', function (Request $request, Response $response, $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $user['sub'];
        $id_permiso = $args['id'];

        try {
            $pdo = conexion();

            // Verificar que la solicitud pertenezca al usuario y esté en estado pendiente
            $sqlCheck = "SELECT id_permiso, estado_general FROM permisos WHERE id_permiso = :id_permiso AND id_usuario = :id_usuario";
            $stmtCheck = $pdo->prepare($sqlCheck);
            $stmtCheck->execute([':id_permiso' => $id_permiso, ':id_usuario' => $id_usuario]);
            $permiso = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            
            if (!$permiso) {
                $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solicitud no encontrada o no autorizada']));
                return $response->withStatus(404);
            }

            // Solo permitir cancelar si está pendiente
            if (strpos($permiso['estado_general'], 'Pendiente') === false) {
                 $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No se puede cancelar una solicitud que ya ha sido procesada']));
                 return $response->withStatus(400);
            }
            
            // Actualizar estado a Cancelada
            $sql = "UPDATE permisos SET estado_general = 'Cancelada' WHERE id_permiso = :id_permiso";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_permiso' => $id_permiso]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Solicitud cancelada correctamente'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en PUT /api/aprendiz/solicitud/{id}/cancelar: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al cancelar la solicitud'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // GET /api/aprendiz/perfil
    // Obtiene el perfil completo del aprendiz autenticado
    // ====================================================================
    $app->get('/api/aprendiz/perfil', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $user['sub'] ?? null;
        if (!$id_usuario) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Token inválido']));
            return $response->withStatus(401);
        }

        try {
            $pdo = conexion();
            
            $sql = "SELECT u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.documento, 
                           u.correo, u.estado, u.id_rol, u.id_programa,
                           p.nombre_programa, p.numero_ficha, p.nivel, p.centro_formacion, 
                           j.nombre_jornada, r.nombre_rol
                    FROM usuarios u
                    LEFT JOIN programas_formacion p ON u.id_programa = p.id_programa
                    LEFT JOIN jornadas j ON p.id_jornada = j.id_jornada
                    LEFT JOIN roles r ON u.id_rol = r.id_rol
                    WHERE u.id_usuario = :id_usuario";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id_usuario' => $id_usuario]);
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($usuario) {
                // Estructurar datos del programa
                $perfil = [
                    'id_usuario' => $usuario['id_usuario'],
                    'nombre' => $usuario['nombre'],
                    'apellido' => $usuario['apellido'],
                    'tipo_documento' => $usuario['tipo_documento'],
                    'documento' => $usuario['documento'],
                    'correo' => $usuario['correo'],
                    'estado' => $usuario['estado'],
                    'nombre_rol' => $usuario['nombre_rol']
                ];

                if ($usuario['id_programa']) {
                    $perfil['programa'] = [
                        'nombre_programa' => $usuario['nombre_programa'],
                        'numero_ficha' => $usuario['numero_ficha'],
                        'nivel' => $usuario['nivel'],
                        'centro_formacion' => $usuario['centro_formacion'],
                        'nombre_jornada' => $usuario['nombre_jornada']
                    ];
                }

                $response->getBody()->write(json_encode([
                    'status' => 'ok',
                    'perfil' => $perfil
                ]));
                return $response->withStatus(200);
            } else {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Usuario no encontrado'
                ]));
                return $response->withStatus(404);
            }

        } catch (Throwable $e) {
            error_log("Error en /api/aprendiz/perfil: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al obtener perfil'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // GET /api/aprendiz/instructores
    // Obtiene la lista de instructores activos para el autocompletado
    // ====================================================================
    $app->get('/api/aprendiz/instructores', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        try {
            $pdo = conexion();
            
            $sql = "SELECT u.id_usuario, u.nombre, u.apellido, u.documento
                    FROM usuarios u
                    JOIN roles r ON u.id_rol = r.id_rol
                    WHERE LOWER(r.nombre_rol) = 'instructor' AND LOWER(u.estado) = 'activo'
                    ORDER BY u.nombre, u.apellido ASC";
            
            $stmt = $pdo->query($sql);
            $instructores = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'instructores' => $instructores
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/aprendiz/instructores: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al obtener instructores'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // POST /api/aprendiz/solicitud
    // Crea una nueva solicitud de permiso de salida
    // ====================================================================
    $app->post('/api/aprendiz/solicitud', function (Request $request, Response $response) {
        // TRACE LOG START


        $user = verifyJwtFromHeader($request);

        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        // Verificar que sea aprendiz
        if (strcasecmp($user['nombre_rol'] ?? '', 'Aprendiz') !== 0) {

            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Solo aprendices pueden crear solicitudes']));
            return $response->withStatus(403);
        }


        $id_usuario = $user['sub'] ?? null;
        if (!$id_usuario) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Token inválido']));
            return $response->withStatus(401);
        }

        $data = $request->getParsedBody();

        
        // Validar campos requeridos
        $required = ['id_instructor_destino', 'motivo', 'hora_salida', 'reingresa'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => "Campo requerido: $field"
                ]));
                return $response->withStatus(400);
            }
        }

        try {

            $pdo = conexion();

            
            // Preparar datos
            $id_instructor = $data['id_instructor_destino'];
            $motivo = $data['motivo'];
            $descripcion = $data['descripcion'] ?? null;
            $hora_salida = $data['hora_salida'];
            $hora_regreso = ($data['reingresa'] === 'si') ? ($data['hora_ingreso'] ?? null) : null;
            
            // Validar hora de regreso si reingresa
            if ($data['reingresa'] === 'si' && !$hora_regreso) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Hora de ingreso requerida si reingresa'
                ]));
                return $response->withStatus(400);
            }

            // Manejo del archivo de soporte
            $soporte_path = null;
            $uploadedFiles = $request->getUploadedFiles();
            
            if (isset($uploadedFiles['soporte']) && $uploadedFiles['soporte']->getError() === UPLOAD_ERR_OK) {
                $uploadedFile = $uploadedFiles['soporte'];
                $extension = pathinfo($uploadedFile->getClientFilename(), PATHINFO_EXTENSION);
                $allowed_extensions = ['jpg', 'jpeg', 'png', 'gif'];
                
                if (!in_array(strtolower($extension), $allowed_extensions)) {
                    $response->getBody()->write(json_encode([
                        'status' => 'error',
                        'message' => 'Tipo de archivo no permitido. Solo imágenes (JPG, PNG, GIF).'
                    ]));
                    return $response->withStatus(400);
                }

                // Validar tamaño (5MB)
                if ($uploadedFile->getSize() > 5 * 1024 * 1024) {
                    $response->getBody()->write(json_encode([
                        'status' => 'error',
                        'message' => 'El archivo excede el tamaño máximo de 5MB.'
                    ]));
                    return $response->withStatus(400);
                }

                // Crear directorio si no existe
                $directory = __DIR__ . '/../public/uploads/soporte';
                if (!is_dir($directory)) {
                    mkdir($directory, 0755, true);
                }

                // Generar nombre único
                $filename = uniqid('soporte_') . '.' . $extension;
                $soporte_path = 'uploads/soporte/' . $filename;
                
                // Mover archivo
                $uploadedFile->moveTo($directory . DIRECTORY_SEPARATOR . $filename);
            }

            // Insertar permiso
            $sql = "INSERT INTO permisos 
                    (id_usuario, id_instructor_destino, motivo, descripcion, soporte, hora_salida, hora_regreso, estado_general, fecha_solicitud)
                    VALUES 
                    (:id_usuario, :id_instructor, :motivo, :descripcion, :soporte, :hora_salida, :hora_regreso, 'Pendiente Instructor', NOW())";
            

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id_usuario' => $id_usuario,
                ':id_instructor' => $id_instructor,
                ':motivo' => $motivo,
                ':descripcion' => $descripcion,
                ':soporte' => $soporte_path,
                ':hora_salida' => $hora_salida,
                ':hora_regreso' => $hora_regreso
            ]);


            $id_permiso = $pdo->lastInsertId();

            // Crear aprobación pendiente para el instructor
            $sql_aprobacion = "INSERT INTO aprobaciones 
                               (id_permiso, id_usuario_aprobador, rol_aprobador, estado_aprobacion)
                               VALUES 
                               (:id_permiso, :id_instructor, 'Instructor', 'Pendiente')";
            

            $stmt_aprobacion = $pdo->prepare($sql_aprobacion);
            $stmt_aprobacion->execute([
                ':id_permiso' => $id_permiso,
                ':id_instructor' => $id_instructor
            ]);


            // --- INICIO INTEGRACIÓN CORREO ---
            // Obtener datos para el correo
            // 1. Datos del Instructor

            $stmtInst = $pdo->prepare("SELECT nombre, apellido, correo FROM usuarios WHERE id_usuario = ?");
            $stmtInst->execute([$id_instructor]);
            $instructorData = $stmtInst->fetch(PDO::FETCH_ASSOC);


            // 2. Datos del Aprendiz y Programa
            $stmtApz = $pdo->prepare("
                SELECT u.nombre, u.apellido, u.documento, 
                       p.nombre_programa, p.numero_ficha, j.nombre_jornada
                FROM usuarios u
                LEFT JOIN programas_formacion p ON u.id_programa = p.id_programa
                LEFT JOIN jornadas j ON p.id_jornada = j.id_jornada
                WHERE u.id_usuario = ?
            ");
            $stmtApz->execute([$id_usuario]);
            $aprendizData = $stmtApz->fetch(PDO::FETCH_ASSOC);


            if ($instructorData && $aprendizData && !empty($instructorData['correo'])) {

                try {
                    // Verificando existencia antes de incluir
                    if (!file_exists(__DIR__ . '/../email/solicitud/notificarinstructor.php')) {
                        throw new Exception("File not found: " . __DIR__ . '/../email/solicitud/notificarinstructor.php');
                    }
                    require_once __DIR__ . '/../email/solicitud/notificarinstructor.php';

                    
                    $nombreInstructor = $instructorData['nombre'] . ' ' . $instructorData['apellido'];
                    $nombreAprendiz = $aprendizData['nombre'] . ' ' . $aprendizData['apellido'];
                    
                    // Enviar correo

                    enviarCorreoInstructor(
                        $instructorData['correo'],
                        $nombreInstructor,
                        $nombreAprendiz,
                        $aprendizData['documento'],
                        $aprendizData['nombre_programa'] ?? 'N/A',
                        $aprendizData['numero_ficha'] ?? 'N/A',
                        $aprendizData['nombre_jornada'] ?? 'N/A',
                        !empty($descripcion) ? $descripcion : $motivo 
                    );

                } catch (Throwable $e) {

                }
            }

            // --- FIN INTEGRACIÓN CORREO ---

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Solicitud creada exitosamente',
                'id_permiso' => $id_permiso
            ]));
            return $response->withStatus(201);

        } catch (Throwable $e) {
            error_log("Error en /api/aprendiz/solicitud: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al crear solicitud'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // GET /api/aprendiz/solicitud/{id}/estado
    // Obtiene el estado actualizado de una solicitud específica
    // ====================================================================
    $app->get('/api/aprendiz/solicitud/{id}/estado', function (Request $request, Response $response, array $args) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_permiso = $args['id'] ?? 0;
        $id_usuario = $user['sub'];

        if ($id_permiso <= 0) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'ID inválido']));
            return $response->withStatus(400);
        }

        try {
            $pdo = conexion();
            
            // Consultar estado del permiso y aprobaciones
            $sql = "
                SELECT 
                    P.id_permiso,
                    P.estado_general,
                    P.motivo,
                    P.descripcion,
                    P.soporte,
                    -- Aprobación del Instructor
                    (SELECT estado_aprobacion FROM aprobaciones WHERE id_permiso = P.id_permiso AND rol_aprobador = 'Instructor' ORDER BY fecha_aprobacion DESC LIMIT 1) AS estado_instructor,
                    (SELECT fecha_aprobacion FROM aprobaciones WHERE id_permiso = P.id_permiso AND rol_aprobador = 'Instructor' ORDER BY fecha_aprobacion DESC LIMIT 1) AS fecha_instructor,
                    (SELECT motivo FROM aprobaciones WHERE id_permiso = P.id_permiso AND rol_aprobador = 'Instructor' ORDER BY fecha_aprobacion DESC LIMIT 1) AS motivo_rechazo_instructor,
                    (SELECT U.nombre FROM aprobaciones A INNER JOIN usuarios U ON A.id_usuario_aprobador = U.id_usuario WHERE A.id_permiso = P.id_permiso AND A.rol_aprobador = 'Instructor' ORDER BY A.fecha_aprobacion DESC LIMIT 1) AS nombre_instructor,
                    (SELECT U.apellido FROM aprobaciones A INNER JOIN usuarios U ON A.id_usuario_aprobador = U.id_usuario WHERE A.id_permiso = P.id_permiso AND A.rol_aprobador = 'Instructor' ORDER BY A.fecha_aprobacion DESC LIMIT 1) AS apellido_instructor,
                    -- Aprobación del Coordinador
                    (SELECT estado_aprobacion FROM aprobaciones WHERE id_permiso = P.id_permiso AND rol_aprobador = 'Coordinacion' ORDER BY fecha_aprobacion DESC LIMIT 1) AS estado_coordinador,
                    (SELECT fecha_aprobacion FROM aprobaciones WHERE id_permiso = P.id_permiso AND rol_aprobador = 'Coordinacion' ORDER BY fecha_aprobacion DESC LIMIT 1) AS fecha_coordinador,
                    (SELECT motivo FROM aprobaciones WHERE id_permiso = P.id_permiso AND rol_aprobador = 'Coordinacion' ORDER BY fecha_aprobacion DESC LIMIT 1) AS motivo_rechazo_coordinador,
                    (SELECT qr FROM aprobaciones WHERE id_permiso = P.id_permiso AND rol_aprobador = 'Coordinacion' ORDER BY fecha_aprobacion DESC LIMIT 1) AS qr_code,
                    (SELECT U.nombre FROM aprobaciones A INNER JOIN usuarios U ON A.id_usuario_aprobador = U.id_usuario WHERE A.id_permiso = P.id_permiso AND A.rol_aprobador = 'Coordinacion' ORDER BY A.fecha_aprobacion DESC LIMIT 1) AS nombre_coordinador,
                    (SELECT U.apellido FROM aprobaciones A INNER JOIN usuarios U ON A.id_usuario_aprobador = U.id_usuario WHERE A.id_permiso = P.id_permiso AND A.rol_aprobador = 'Coordinacion' ORDER BY A.fecha_aprobacion DESC LIMIT 1) AS apellido_coordinador
                FROM
                    permisos P
                WHERE
                    P.id_permiso = :id_permiso
                    AND P.id_usuario = :id_usuario
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id_permiso' => $id_permiso,
                ':id_usuario' => $id_usuario
            ]);
            
            $solicitud = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$solicitud) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Solicitud no encontrada'
                ]));
                return $response->withStatus(404);
            }

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'solicitud' => $solicitud
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/aprendiz/solicitud/{id}/estado: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al consultar estado'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // PUT /api/aprendiz/actualizar-correo
    // Actualiza el correo electrónico del aprendiz autenticado
    // ====================================================================
    $app->put('/api/aprendiz/actualizar-correo', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $user['sub'] ?? null;
        if (!$id_usuario) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Token inválido']));
            return $response->withStatus(401);
        }

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

            // Verificar que el correo no exista en otro usuario
            $sql_check = "SELECT id_usuario FROM usuarios WHERE correo = :correo AND id_usuario != :id_usuario";
            $stmt_check = $pdo->prepare($sql_check);
            $stmt_check->execute([
                ':correo' => $nuevo_correo,
                ':id_usuario' => $id_usuario
            ]);

            if ($stmt_check->fetch()) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Este correo ya se encuentra registrado en otra cuenta'
                ]));
                return $response->withStatus(400);
            }

            // Actualizar correo
            $sql_update = "UPDATE usuarios SET correo = :correo WHERE id_usuario = :id_usuario";
            $stmt_update = $pdo->prepare($sql_update);
            $stmt_update->execute([
                ':correo' => $nuevo_correo,
                ':id_usuario' => $id_usuario
            ]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Correo actualizado exitosamente'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/aprendiz/actualizar-correo: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al actualizar correo'
            ]));
            return $response->withStatus(500);
        }
    });

    // ====================================================================
    // PUT /api/aprendiz/cambiar-contrasena
    // Cambia la contraseña del aprendiz autenticado
    // ====================================================================
    $app->put('/api/aprendiz/cambiar-contrasena', function (Request $request, Response $response) {
        $user = verifyJwtFromHeader($request);
        if (!$user) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'No autorizado']));
            return $response->withStatus(401);
        }

        $id_usuario = $user['sub'] ?? null;
        if (!$id_usuario) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Token inválido']));
            return $response->withStatus(401);
        }

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

            // Obtener contraseña actual del usuario
            $sql_get = "SELECT contrasena FROM usuarios WHERE id_usuario = :id_usuario";
            $stmt_get = $pdo->prepare($sql_get);
            $stmt_get->execute([':id_usuario' => $id_usuario]);
            $usuario = $stmt_get->fetch(PDO::FETCH_ASSOC);

            if (!$usuario) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Usuario no encontrado'
                ]));
                return $response->withStatus(404);
            }

            // Verificar contraseña actual
            if (!password_verify($contrasena_actual, $usuario['contrasena'])) {
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'Contraseña incorrecta, vuelve a intentarlo'
                ]));
                return $response->withStatus(400);
            }

            // Hashear nueva contraseña
            $nueva_clave_hash = password_hash($contrasena_nueva, PASSWORD_DEFAULT);

            // Actualizar contraseña
            $sql_update = "UPDATE usuarios SET contrasena = :contrasena WHERE id_usuario = :id_usuario";
            $stmt_update = $pdo->prepare($sql_update);
            $stmt_update->execute([
                ':contrasena' => $nueva_clave_hash,
                ':id_usuario' => $id_usuario
            ]);

            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'message' => 'Contraseña actualizada exitosamente'
            ]));
            return $response->withStatus(200);

        } catch (Throwable $e) {
            error_log("Error en /api/aprendiz/cambiar-contrasena: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al cambiar contraseña'
            ]));
            return $response->withStatus(500);
        }
    });
};
