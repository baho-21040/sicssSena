<?php
// controllers/SolicitudController.php
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class SolicitudController {

    private static function getJwtSecret() {
        // Lee desde env o archivo config
        return getenv('JWT_SECRET') ?: 'TU_SECRETO_MUY_SEGURO';
    }

    // POST /api/login
    public function login(Request $request, Response $response, $args) {
        error_log("🔍 Login: Inicio de función login");
        $data = $request->getParsedBody();
        $documento = $data['documento'] ?? '';
        $password = $data['password'] ?? '';
        error_log("🔍 Login: documento=$documento");

        if (!$documento || !$password) {
            error_log("❌ Login: Falta documento o password");
            $payload = ['status' => 'error', 'message' => 'Documento y contraseña son requeridos'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(400);
        }

        error_log("🔍 Login: Obteniendo conexión a BD");
        $pdo = conexion();
        error_log("✅ Login: Conexión obtenida");

        // Buscamos todos los usuarios con ese documento (posible multicuenta)
        $sql = "SELECT u.id_usuario, u.nombre, u.apellido, u.contrasena, u.estado, r.id_rol, r.nombre_rol
                FROM usuarios u
                LEFT JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.documento = :documento";
        error_log("🔍 Login: Ejecutando query");
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':documento' => $documento]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("✅ Login: Query ejecutada, " . count($rows) . " filas encontradas");

        if (!$rows || count($rows) === 0) {
            error_log("❌ Login: No se encontraron usuarios");
            $payload = ['status' => 'error', 'message' => 'Credenciales inválidas'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(401);
        }

        // Filtramos por coincidencia de contraseña (puede haber múltiples usuarios con mismo documento)
        $matchedAccounts = [];
        error_log("🔍 Login: Verificando passwords...");
        foreach ($rows as $r) {
            // Supongamos que contrasena está hasheada con password_hash
            if (password_verify($password, $r['contrasena'])) {
                $matchedAccounts[] = $r;
            }
        }
        error_log("✅ Login: Password verificado, " . count($matchedAccounts) . " cuentas coinciden");

        if (count($matchedAccounts) === 0) {
            // No hay contraseña que coincida
            error_log("❌ Login: Password no coincide");
            $payload = ['status' => 'error', 'message' => 'Credenciales inválidas'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(401);
        }

        // Si hay más de una cuenta válida -> multicuenta
        if (count($matchedAccounts) > 1) {
            error_log("👥 Login: Múltiples cuentas detectadas");
            // Sólo devolvemos campos seguros: id_usuario, nombre_rol, estado
            $accounts = array_map(function($a) {
                return [
                    'id_usuario' => (int)$a['id_usuario'],
                    'nombre_rol' => $a['nombre_rol'] ?? 'Sin rol',
                    'estado' => $a['estado'] ?? 'Inactivo'
                ];
            }, $matchedAccounts);

            $payload = ['status' => 'multi', 'accounts' => $accounts];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(200);
        }

        error_log("✅ Login: Una sola cuenta, verificando estado");
        // Sólo 1 cuenta coincidente -> verificar estado
        $account = $matchedAccounts[0];
        if (strtolower($account['estado']) !== 'activo') {
            error_log("⚠️ Login: Cuenta inactiva");
            $payload = ['status' => 'inactive', 'message' => 'Cuenta inactiva'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(403);
        }

        error_log("✅ Login: Generando JWT...");
        // Generar JWT
        $secret = self::getJwtSecret();
        $now = time();
        $exp = $now + (86400 * 7); // 7 días de expiración

        $tokenPayload = [
            'iat' => $now,
            'exp' => $exp,
            'sub' => $account['id_usuario'],
            'nombre' => $account['nombre'],
            'apellido' => $account['apellido'],
            'id_rol' => $account['id_rol'],
            'nombre_rol' => $account['nombre_rol']
        ];

        $jwt = JWT::encode($tokenPayload, $secret, 'HS256');

        error_log("✅ Login: JWT generado, enviando respuesta OK");
        $payload = ['status' => 'ok', 'token' => $jwt, 'rol' => $account['nombre_rol']];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type','application/json')->withStatus(200);
    }

    // POST /api/login/select  -> recibe id_usuario seleccionado para multicuenta
    public function selectAccount(Request $request, Response $response, $args) {
        $data = $request->getParsedBody();
        $id_usuario = $data['id_usuario'] ?? null;

        if (!$id_usuario) {
            $payload = ['status'=>'error','message'=>'id_usuario requerido'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(400);
        }

        $pdo = conexion();
        $sql = "SELECT u.id_usuario,u.nombre,u.apellido,u.estado,r.id_rol,r.nombre_rol
                FROM usuarios u
                LEFT JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.id_usuario = :id_usuario";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id_usuario' => $id_usuario]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$account) {
            $payload = ['status'=>'error','message'=>'Cuenta no encontrada'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(404);
        }

        if (strtolower($account['estado']) !== 'activo') {
            $payload = ['status'=>'inactive','message'=>'Cuenta inactiva'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(403);
        }

        $secret = self::getJwtSecret();
        $now = time();
        $exp = $now + (86400 * 7); // 7 días de expiración

        $tokenPayload = [
            'iat' => $now,
            'exp' => $exp,
            'sub' => $account['id_usuario'],
            'nombre' => $account['nombre'],
            'apellido' => $account['apellido'],
            'id_rol' => $account['id_rol'],
            'nombre_rol' => $account['nombre_rol']
        ];

        $jwt = JWT::encode($tokenPayload, $secret, 'HS256');

        $payload = ['status'=>'ok','token'=>$jwt,'rol'=>$account['nombre_rol']];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type','application/json')->withStatus(200);
    }

    // ==================== RECUPERACIÓN DE CONTRASEÑA ====================

    // Helper para generar código de 6 dígitos
    private function generateResetCode() {
        return str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    // Helper para limpiar códigos vencidos o usados
    private function cleanExpiredCodes($pdo) {
        $sql = "DELETE FROM password_resets WHERE used = 1 OR expires_at < NOW()";
        $pdo->exec($sql);
    }

    // POST /api/password/request - Solicitar código de recuperación
    public function requestPasswordReset(Request $request, Response $response, $args) {
        error_log("🔍 RequestPasswordReset: Inicio");
        require_once __DIR__ . '/../email/cambioclave.php';
        
        $data = $request->getParsedBody();
        $documento = $data['documento'] ?? '';

        if (!$documento) {
            $payload = ['status'=>'error','message'=>'Documento es requerido'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(400);
        }

        $pdo = conexion();

        // Buscar usuario por documento
        $sql = "SELECT id_usuario, nombre, apellido, correo FROM usuarios WHERE documento = :documento";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':documento' => $documento]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            // Por seguridad, no reveleramos si el documento existe o no
            $payload = ['status'=>'ok','message'=>'Si el documento existe, recibirás un código en tu correo registrado'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(200);
        }

        if (!$usuario['correo']) {
            $payload = ['status'=>'error','message'=>'El usuario no tiene correo registrado'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(400);
        }

        // Limpiar códigos antiguos
        $this->cleanExpiredCodes($pdo);

        // Eliminar códigos anteriores de este usuario (no usados)
        $sqlDelete = "DELETE FROM password_resets WHERE id_usuario = :id_usuario";
        $stmtDelete = $pdo->prepare($sqlDelete);
        $stmtDelete->execute([':id_usuario' => $usuario['id_usuario']]);

        // Generar nuevo código
        $codigo = $this->generateResetCode();
        $expiresAt = date('Y-m-d H:i:s', time() + 300); // 5 minutos = 300 segundos

        // Guardar en BD
        $sqlInsert = "INSERT INTO password_resets (id_usuario, token, expires_at) VALUES (:id_usuario, :token, :expires_at)";
        $stmtInsert = $pdo->prepare($sqlInsert);
        $stmtInsert->execute([
            ':id_usuario' => $usuario['id_usuario'],
            ':token' => $codigo,
            ':expires_at' => $expiresAt
        ]);

        // Enviar email
        $nombreCompleto = trim($usuario['nombre'] . ' ' . $usuario['apellido']);
        $emailEnviado = enviarCodigoCambioClave($usuario['correo'], $nombreCompleto, $codigo);

        if (!$emailEnviado) {
            error_log("❌ RequestPasswordReset: Error al enviar email");
            $payload = ['status'=>'error','message'=>'Error al enviar el correo. Intenta de nuevo.'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(500);
        }

        error_log("✅ RequestPasswordReset: Código enviado a " . $usuario['correo']);
        $payload = ['status'=>'ok','message'=>'Código enviado al correo registrado','email_masked'=>$this->maskEmail($usuario['correo'])];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type','application/json')->withStatus(200);
    }

    // POST /api/password/verify - Verificar código
    public function verifyResetCode(Request $request, Response $response, $args) {
        error_log("🔍 VerifyResetCode: Inicio");
        $data = $request->getParsedBody();
        $documento = $data['documento'] ?? '';
        $token = $data['token'] ?? '';

        if (!$documento || !$token) {
            $payload = ['status'=>'error','message'=>'Documento y código son requeridos'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(400);
        }

        $pdo = conexion();

        // Buscar usuario
        $sqlUser = "SELECT id_usuario FROM usuarios WHERE documento = :documento";
        $stmtUser = $pdo->prepare($sqlUser);
        $stmtUser->execute([':documento' => $documento]);
        $usuario = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            $payload = ['status'=>'error','message'=>'Código inválido'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(401);
        }

        // Verificar código
        $sqlToken = "SELECT id, expires_at, used FROM password_resets 
                     WHERE id_usuario = :id_usuario AND token = :token";
        $stmtToken = $pdo->prepare($sqlToken);
        $stmtToken->execute([
            ':id_usuario' => $usuario['id_usuario'],
            ':token' => $token
        ]);
        $resetRecord = $stmtToken->fetch(PDO::FETCH_ASSOC);

        if (!$resetRecord) {
            error_log("❌ VerifyResetCode: Código no encontrado");
            $payload = ['status'=>'error','message'=>'Código inválido'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(401);
        }

        if ($resetRecord['used'] == 1) {
            error_log("❌ VerifyResetCode: Código ya usado");
            $payload = ['status'=>'error','message'=>'Este código ya fue utilizado'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(401);
        }

        if (strtotime($resetRecord['expires_at']) < time()) {
            error_log("❌ VerifyResetCode: Código expirado");
            $payload = ['status'=>'error','message'=>'Este código ha expirado. Solicita uno nuevo.'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(401);
        }

        // Código válido - generar token temporal (10 minutos)
        $secret = self::getJwtSecret();
        $now = time();
        $exp = $now + 600; // 10 minutos

        $tempTokenPayload = [
            'iat' => $now,
            'exp' => $exp,
            'sub' => $usuario['id_usuario'],
            'purpose' => 'password_reset',
            'reset_id' => $resetRecord['id']
        ];

        $tempToken = JWT::encode($tempTokenPayload, $secret, 'HS256');

        error_log("✅ VerifyResetCode: Código verificado correctamente");
        $payload = ['status'=>'ok','temp_token'=>$tempToken];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type','application/json')->withStatus(200);
    }

    // POST /api/password/reset - Cambiar contraseña
    public function resetPassword(Request $request, Response $response, $args) {
        error_log("🔍 ResetPassword: Inicio");
        $data = $request->getParsedBody();
        $tempToken = $data['temp_token'] ?? '';
        $newPassword = $data['new_password'] ?? '';

        if (!$tempToken || !$newPassword) {
            $payload = ['status'=>'error','message'=>'Token y contraseña son requeridos'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(400);
        }

        // Validar contraseña (mínimo 8 caracteres)
        if (strlen($newPassword) < 8) {
            $payload = ['status'=>'error','message'=>'La contraseña debe tener al menos 8 caracteres'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(400);
        }

        // Verificar token temporal
        try {
            $secret = self::getJwtSecret();
            $decoded = JWT::decode($tempToken, new Key($secret, 'HS256'));
            $decodedArray = (array) $decoded;

            if (!isset($decodedArray['purpose']) || $decodedArray['purpose'] !== 'password_reset') {
                throw new Exception('Token inválido');
            }

            $idUsuario = $decodedArray['sub'];
            $resetId = $decodedArray['reset_id'];

        } catch (\Throwable $e) {
            error_log("❌ ResetPassword: Token inválido - " . $e->getMessage());
            $payload = ['status'=>'error','message'=>'Token inválido o expirado'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(401);
        }

        $pdo = conexion();

        // Verificar que el código no haya sido usado
        $sqlCheck = "SELECT used FROM password_resets WHERE id = :id";
        $stmtCheck = $pdo->prepare($sqlCheck);
        $stmtCheck->execute([':id' => $resetId]);
        $resetRecord = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$resetRecord || $resetRecord['used'] == 1) {
            $payload = ['status'=>'error','message'=>'Este código ya fue utilizado'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type','application/json')->withStatus(401);
        }

        // Actualizar contraseña
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $sqlUpdate = "UPDATE usuarios SET contrasena = :contrasena WHERE id_usuario = :id_usuario";
        $stmtUpdate = $pdo->prepare($sqlUpdate);
        $stmtUpdate->execute([
            ':contrasena' => $hashedPassword,
            ':id_usuario' => $idUsuario
        ]);

        // Marcar código como usado
        $sqlMarkUsed = "UPDATE password_resets SET used = 1 WHERE id = :id";
        $stmtMarkUsed = $pdo->prepare($sqlMarkUsed);
        $stmtMarkUsed->execute([':id' => $resetId]);

        // Limpiar códigos vencidos
        $this->cleanExpiredCodes($pdo);

        error_log("✅ ResetPassword: Contraseña actualizada para usuario $idUsuario");
        $payload = ['status'=>'ok','message'=>'Contraseña actualizada correctamente'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type','application/json')->withStatus(200);
    }

    // Helper para enmascarar email
    private function maskEmail($email) {
        $parts = explode('@', $email);
        if (count($parts) !== 2) return $email;
        
        $username = $parts[0];
        $domain = $parts[1];
        
        $usernameLength = strlen($username);
        if ($usernameLength <= 2) {
            $masked = $username[0] . str_repeat('*', $usernameLength - 1);
        } else {
            $masked = substr($username, 0, 2) . str_repeat('*', $usernameLength - 2);
        }
        
        return $masked . '@' . $domain;
    }

}
