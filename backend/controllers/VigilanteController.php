<?php
// backend/controllers/VigilanteController.php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

class VigilanteController {

    // POST /api/vigilante/verificar-qr
    public function verificarQR(Request $request, Response $response, $args) {
        $data = $request->getParsedBody();
        $qr_code = $data['qr_code'] ?? '';

        if (!$qr_code) {
            $payload = ['status' => 'error', 'message' => 'Código QR requerido'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $pdo = conexion();

        // 1. Buscar la aprobación asociada al QR
        // Asumimos que el campo 'qr' en aprobaciones guarda el código único
        $sql = "SELECT a.id_aprobacion, a.estado_aprobacion, a.qr, 
                       p.hora_salida, p.hora_regreso, p.motivo,
                       u.nombre, u.apellido, u.documento, u.id_usuario,
                       pf.nombre_programa, pf.numero_ficha
                FROM aprobaciones a
                JOIN permisos p ON a.id_permiso = p.id_permiso
                JOIN usuarios u ON p.id_usuario = u.id_usuario
                LEFT JOIN programas_formacion pf ON u.id_programa = pf.id_programa
                WHERE a.qr = :qr";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':qr' => $qr_code]);
        $aprobacion = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$aprobacion) {
            $payload = ['status' => 'error', 'message' => 'Código QR no encontrado o inválido'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        if ($aprobacion['estado_aprobacion'] !== 'Aprobado') {
            $payload = ['status' => 'error', 'message' => 'Este permiso no está aprobado (Estado: ' . $aprobacion['estado_aprobacion'] . ')'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        // 2. Verificar historial de accesos
        $sqlAccesos = "SELECT * FROM accesos WHERE id_aprobacion = :id_aprobacion ORDER BY fecha_hora ASC";
        $stmtAccesos = $pdo->prepare($sqlAccesos);
        $stmtAccesos->execute([':id_aprobacion' => $aprobacion['id_aprobacion']]);
        $accesos = $stmtAccesos->fetchAll(PDO::FETCH_ASSOC);

        $conteoAccesos = count($accesos);
        $tieneRegreso = !empty($aprobacion['hora_regreso']);
        
        $accionPermitida = null; // 'SALIDA', 'ENTRADA', o null (denegado)
        $mensaje = '';

        if ($conteoAccesos == 0) {
            // Primer uso: Debe ser SALIDA
            $accionPermitida = 'SALIDA';
            $mensaje = 'Salida autorizada';
        } elseif ($conteoAccesos == 1) {
            // Ya hubo una salida.
            if ($tieneRegreso) {
                // Si tiene hora de regreso, permitimos ENTRADA
                $accionPermitida = 'ENTRADA';
                $mensaje = 'Reingreso autorizado';
                
                // Opcional: Verificar si ya pasó la hora límite de regreso (aunque usualmente se permite entrar y se marca como tarde)
            } else {
                // No tiene regreso, así que ya gastó su único uso
                $payload = ['status' => 'error', 'message' => 'Este código ya fue utilizado para SALIDA y no tiene reingreso autorizado.'];
                $response->getBody()->write(json_encode($payload));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
            }
        } else {
            // Ya tiene 2 o más accesos (Salida y Entrada)
            $payload = ['status' => 'error', 'message' => 'Este código ya completó su ciclo de Salida y Reingreso.'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        // Respuesta exitosa con datos para mostrar al vigilante
        $payload = [
            'status' => 'ok',
            'accion_requerida' => $accionPermitida,
            'mensaje' => $mensaje,
            'data' => [
                'id_aprobacion' => $aprobacion['id_aprobacion'],
                'aprendiz' => $aprobacion['nombre'] . ' ' . $aprobacion['apellido'],
                'documento' => $aprobacion['documento'],
                'programa' => $aprobacion['nombre_programa'] . ' (' . $aprobacion['numero_ficha'] . ')',
                'motivo' => $aprobacion['motivo'],
                'hora_salida' => $aprobacion['hora_salida'],
                'hora_regreso' => $aprobacion['hora_regreso'] ?: 'No aplica',
                'accesos_previos' => $conteoAccesos
            ]
        ];

        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    // POST /api/vigilante/registrar
    public function registrarAcceso(Request $request, Response $response, $args) {
        $data = $request->getParsedBody();
        $id_aprobacion = $data['id_aprobacion'] ?? null;
        $tipo_acceso = $data['tipo_acceso'] ?? null; // 'SALIDA' o 'ENTRADA'
        $id_vigilante = $data['id_vigilante'] ?? null; // ID del usuario vigilante logueado

        if (!$id_aprobacion || !$tipo_acceso || !$id_vigilante) {
            $payload = ['status' => 'error', 'message' => 'Datos incompletos'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $pdo = conexion();
        
        try {
            $sql = "INSERT INTO accesos (id_aprobacion, tipo_acceso, id_vigilante, fecha_hora) VALUES (:id_aprobacion, :tipo_acceso, :id_vigilante, NOW())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id_aprobacion' => $id_aprobacion,
                ':tipo_acceso' => $tipo_acceso,
                ':id_vigilante' => $id_vigilante
            ]);

            $payload = ['status' => 'ok', 'message' => 'Acceso registrado correctamente'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (PDOException $e) {
            $payload = ['status' => 'error', 'message' => 'Error al registrar acceso: ' . $e->getMessage()];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    // GET /api/vigilante/accesos-hoy
    public function getAccesosHoy(Request $request, Response $response, $args) {
        $pdo = conexion();
        
        try {
            $sql = "SELECT 
                        acc.id_acceso,
                        acc.tipo_acceso,
                        acc.fecha_hora AS fecha_acceso,
                        u.nombre,
                        u.apellido,
                        CONCAT(u.nombre, ' ', u.apellido) AS aprendiz,
                        u.documento,
                        p.motivo
                    FROM accesos acc
                    JOIN aprobaciones a ON acc.id_aprobacion = a.id_aprobacion
                    JOIN permisos p ON a.id_permiso = p.id_permiso
                    JOIN usuarios u ON p.id_usuario = u.id_usuario
                    WHERE DATE(acc.fecha_hora) = CURDATE()
                    ORDER BY acc.fecha_hora DESC";
            
            $stmt = $pdo->query($sql);
            $accesos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $payload = [
                'status' => 'ok',
                'accesos' => $accesos
            ];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (PDOException $e) {
            $payload = ['status' => 'error', 'message' => 'Error al obtener accesos: ' . $e->getMessage()];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }
}
