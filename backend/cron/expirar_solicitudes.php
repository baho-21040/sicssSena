<?php
/**
 * Script de Expiración Automática de Solicitudes
 * 
 * Este script rechaza automáticamente las solicitudes que llevan más de 1 hora
 * sin ser aprobadas o rechazadas por el instructor.
 * 
 * Ejecución recomendada: Cada 5-10 minutos vía cron job o Task Scheduler
 */

// Incluir archivo de conexión
require_once __DIR__ . '/../conexion.php';

// Configuración
$TIEMPO_EXPIRACION_HORAS = 1; // 1 hora
$LOG_FILE = __DIR__ . '/expiracion.log';

// Función para escribir en log
function escribirLog($mensaje) {
    global $LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($LOG_FILE, "[$timestamp] $mensaje\n", FILE_APPEND);
}

try {
    escribirLog("=== Iniciando proceso de expiración ===");
    
    // Conectar a la base de datos
    $pdo = conexion();
    
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
    escribirLog("Solicitudes expiradas encontradas: $total_expiradas");
    
    if ($total_expiradas === 0) {
        escribirLog("No hay solicitudes para expirar");
        escribirLog("=== Proceso finalizado ===\n");
        exit(0);
    }
    
    // Procesar cada solicitud expirada
    $rechazadas_exitosamente = 0;
    
    foreach ($solicitudes_expiradas as $solicitud) {
        $id_permiso = $solicitud['id_permiso'];
        $id_instructor = $solicitud['id_instructor_destino'];
        $minutos = $solicitud['minutos_transcurridos'];
        
        try {
            // Iniciar transacción
            $pdo->beginTransaction();
            
            // Insertar rechazo automático en aprobaciones
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
            
            // Confirmar transacción
            $pdo->commit();
            
            $rechazadas_exitosamente++;
            escribirLog("Solicitud #$id_permiso rechazada automáticamente ($minutos minutos transcurridos)");
            
        } catch (Exception $e) {
            // Revertir transacción en caso de error
            $pdo->rollBack();
            escribirLog("ERROR al rechazar solicitud #$id_permiso: " . $e->getMessage());
        }
    }
    
    escribirLog("Solicitudes rechazadas exitosamente: $rechazadas_exitosamente de $total_expiradas");
    escribirLog("=== Proceso finalizado ===\n");
    
    // Retornar resultado
    echo json_encode([
        'status' => 'ok',
        'total_encontradas' => $total_expiradas,
        'total_rechazadas' => $rechazadas_exitosamente,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    escribirLog("ERROR CRÍTICO: " . $e->getMessage());
    escribirLog("=== Proceso finalizado con errores ===\n");
    
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    exit(1);
}
