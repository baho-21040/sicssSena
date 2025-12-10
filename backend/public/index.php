<?php
// Desactivar salida de errores HTML para no romper JSON
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// =================================================================================
// CORS HEADERS - Deben ir ANTES de cualquier salida
// =================================================================================
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Permitir solicitudes desde localhost:5173 o cualquier otro origen en desarrollo
if (!empty($origin)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Fallback para herramientas como Postman o si no llega origin
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400");

// Manejo de solicitud Preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =================================================================================
// INICIO DE LA APLICACIÓN
// =================================================================================

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../conexion.php';
// Controladores
require __DIR__ . '/../controllers/SolicitudController.php';
require __DIR__ . '/../controllers/VigilanteController.php';

use Slim\Factory\AppFactory;
use Slim\Psr7\Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$app = AppFactory::create();

// Ajuste de base path
$app->setBasePath('/SalidaSENA/backend/public');

// Body Parsing Middleware
$app->addBodyParsingMiddleware();

// =================================================================================
// ERROR MIDDLEWARE - Forzar JSON
// =================================================================================
$errorMiddleware = $app->addErrorMiddleware(true, true, true);
$errorMiddleware->setDefaultErrorHandler(function (
    $request,
    Throwable $exception,
    bool $displayErrorDetails,
    bool $logErrors,
    bool $logErrorDetails
) use ($app) {
    $payload = [
        'status' => 'error',
        'message' => $exception->getMessage(),
        'code' => $exception->getCode()
    ];
    
    // Loguear el error internamente
    error_log("Slim Error: " . $exception->getMessage() . "\n" . $exception->getTraceAsString());

    $response = $app->getResponseFactory()->createResponse();
    $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(500);
});

// Middleware para asegurar Content-Type: application/json en todas las respuestas exitosas
$app->add(function ($request, $handler) {
    $response = $handler->handle($request);
    if (!$response->hasHeader('Content-Type')) {
        return $response->withHeader('Content-Type', 'application/json');
    }
    return $response;
});

// Helper JWT
function verifyJwtFromHeader($request) {

    $header = $request->getHeaderLine('Authorization');
    if (!$header) {

        return null;
    }
    if (!preg_match('/Bearer\s+(.*)$/i', $header, $matches)) {

        return null;
    }
    $token = $matches[1];
    try {
        $secret = getenv('JWT_SECRET') ?: 'TU_SECRETO_MUY_SEGURO';
        $decoded = JWT::decode($token, new Key($secret, 'HS256'));

        return (array) $decoded;
    } catch (\Throwable $e) {

        return null;
    }
}

// =================================================================================
// RUTAS
// =================================================================================

// Autenticación
$controller = new SolicitudController();
$app->post('/api/login', [$controller, 'login']);
$app->post('/api/login/select', [$controller, 'selectAccount']);

// Password Reset
$app->post('/api/password/request', [$controller, 'requestPasswordReset']);
$app->post('/api/password/verify', [$controller, 'verifyResetCode']);
$app->post('/api/password/reset', [$controller, 'resetPassword']);

// Perfil de Usuario (/api/me)
$app->get('/api/me', function ($request, $response) {
    $user = verifyJwtFromHeader($request);
    if (!$user || !isset($user['sub'])) {
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Token inválido']));
        return $response->withStatus(401);
    }

    try {
        $pdo = conexion();
        $stmt = $pdo->prepare("SELECT u.id_usuario,u.nombre,u.apellido,u.documento,u.correo,u.estado,u.id_programa,
                                   r.id_rol,r.nombre_rol,
                                   p.nombre_programa,p.numero_ficha,p.nivel,p.centro_formacion,
                                   j.nombre_jornada
                            FROM usuarios u
                            LEFT JOIN roles r ON u.id_rol = r.id_rol
                            LEFT JOIN programas_formacion p ON u.id_programa = p.id_programa
                            LEFT JOIN jornadas j ON p.id_jornada = j.id_jornada
                            WHERE u.id_usuario = :id");
        $stmt->execute([':id' => (int)$user['sub']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']));
            return $response->withStatus(404);
        }

        $payload = [
            'status' => 'ok',
            'user' => [
                'id_usuario' => (int)$row['id_usuario'],
                'nombre' => $row['nombre'],
                'apellido' => $row['apellido'],
                'documento' => $row['documento'],
                'correo' => $row['correo'],
                'estado' => $row['estado'],
                'id_rol' => (int)$row['id_rol'],
                'nombre_rol' => $row['nombre_rol'],
                'programa' => $row['id_programa'] ? [
                    'nombre_programa' => $row['nombre_programa'],
                    'numero_ficha' => $row['numero_ficha'],
                    'nivel' => $row['nivel'],
                    'centro_formacion' => $row['centro_formacion'],
                    'nombre_jornada' => $row['nombre_jornada'],
                ] : null
            ]
        ];
        $response->getBody()->write(json_encode($payload));
        return $response->withStatus(200);
    } catch (Throwable $e) {
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error interno']));
        return $response->withStatus(500);
    }
});

// Lista de Roles
$app->get('/api/roles', function ($request, $response) {
    try {
        $pdo = conexion();
        $stmt = $pdo->query("SELECT id_rol, nombre_rol FROM roles");
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response->getBody()->write(json_encode(['status' => 'ok', 'roles' => $roles]));
        return $response->withStatus(200);
    } catch (Throwable $e) {
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Error al obtener roles']));
        return $response->withStatus(500);
    }
});

// Importar rutas específicas por rol
(require __DIR__ . '/../admin/routes.php')($app);
(require __DIR__ . '/../aprendiz/routes.php')($app);
(require __DIR__ . '/../instructor/routes.php')($app);
(require __DIR__ . '/../cron/routes.php')($app);
(require __DIR__ . '/../coordinacion/routes.php')($app);
(require __DIR__ . '/../vigilante/routes.php')($app);

$app->run();