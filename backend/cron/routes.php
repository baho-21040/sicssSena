<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function ($app) {
    
    // ====================================================================
    // GET /api/cron/expirar-solicitudes
    // Endpoint para expirar solicitudes automáticamente (alternativa a cron)
    // ====================================================================
    $app->get('/api/cron/expirar-solicitudes', function (Request $request, Response $response) {
        
        // Token de seguridad (opcional pero recomendado)
        $token_secreto = 'SENA_CRON_SECRET_2025'; // Cambiar por un token seguro
        $token_recibido = $request->getQueryParams()['token'] ?? '';
        
        if ($token_recibido !== $token_secreto) {
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Token inválido'
            ]));
            return $response->withStatus(403);
        }
        
        try {
            $pdo = conexion();
            $TIEMPO_EXPIRACION_HORAS = 1;
            
            // Buscar solicitudes expiradas
            $sql_buscar = "
                SELECT 
                    id_permiso,
                    id_usuario,
                    id_instructor_destino,
                    fecha_solicitud,
                    TIMESTAMPDIFF(MINUTE, fecha_solicitud, NOW()) as minutos_transcurridos
                FROM 
                    permisos
                WHERE 
                    estado_general = 'Pendiente Instructor'
                    AND fecha_solicitud < DATE_SUB(NOW(), INTERVAL :horas HOUR)
            ";
            
            $stmt = $pdo->prepare($sql_buscar);
            $stmt->execute([':horas' => $TIEMPO_EXPIRACION_HORAS]);
            $solicitudes_expiradas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $total_expiradas = count($solicitudes_expiradas);
            $rechazadas_exitosamente = 0;
            
            // Procesar cada solicitud expirada
            foreach ($solicitudes_expiradas as $solicitud) {
                $id_permiso = $solicitud['id_permiso'];
                $id_instructor = $solicitud['id_instructor_destino'];
                
                try {
                    $pdo->beginTransaction();
                    
                    // Insertar rechazo automático
                    $sql_aprobacion = "
                        INSERT INTO aprobaciones 
                        (id_permiso, id_usuario_aprobador, rol_aprobador, estado_aprobacion, motivo, observaciones) 
                        VALUES 
                        (:id_permiso, :id_instructor, 'Sistema', 'Rechazado', :motivo, :observaciones)
                    ";
                    
                    $stmt_aprobacion = $pdo->prepare($sql_aprobacion);
                    $stmt_aprobacion->execute([
                        ':id_permiso' => $id_permiso,
                        ':id_instructor' => $id_instructor,
                        ':motivo' => 'Tiempo de espera expirado',
                        ':observaciones' => "Rechazado automáticamente por expiración (más de $TIEMPO_EXPIRACION_HORAS hora sin respuesta)"
                    ]);
                    
                    // Actualizar estado del permiso
                    $sql_permiso = "
                        UPDATE permisos 
                        SET estado_general = 'Rechazado' 
                        WHERE id_permiso = :id_permiso
                    ";
                    
                    $stmt_permiso = $pdo->prepare($sql_permiso);
                    $stmt_permiso->execute([':id_permiso' => $id_permiso]);
                    
                    $pdo->commit();
                    $rechazadas_exitosamente++;
                    
                } catch (Exception $e) {
                    $pdo->rollBack();
                    error_log("Error al rechazar solicitud #$id_permiso: " . $e->getMessage());
                }
            }
            
            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'total_encontradas' => $total_expiradas,
                'total_rechazadas' => $rechazadas_exitosamente,
                'timestamp' => date('Y-m-d H:i:s')
            ]));
            return $response->withStatus(200);
            
        } catch (Throwable $e) {
            error_log("Error en /api/cron/expirar-solicitudes: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Error al procesar expiración',
                'timestamp' => date('Y-m-d H:i:s')
            ]));
            return $response->withStatus(500);
        }
    });
};
