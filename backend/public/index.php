<?php
// CORS headers - Agregar ANTES de cualquier cosa para asegurar que se envíen
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Max-Age: 3600');

// Si es una petición OPTIONS (preflight), devolver 200 OK inmediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../conexion.php';
require __DIR__ . '/../controllers/SolicitudController.php';
require __DIR__ . '/../controllers/VigilanteController.php';

use Slim\Factory\AppFactory;
use Slim\Psr7\Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$app = AppFactory::create();

// Ajuste de base path porque la app corre en /SalidaSENA/backend/public
$app->setBasePath('/SalidaSENA/backend/public');

// Body parser para JSON
$app->addBodyParsingMiddleware();

// Middleware de manejo de errores para forzar respuesta JSON
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
    
    $response = $app->getResponseFactory()->createResponse();
    $response->getBody()->write(
        json_encode($payload, JSON_UNESCAPED_UNICODE)
    );
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(500);
});

// Middleware para asegurar Content-Type: application/json
$app->add(function ($request, $handler) {
    $response = $handler->handle($request);
    if (!$response->hasHeader('Content-Type')) {
        return $response->withHeader('Content-Type', 'application/json');
    }
    return $response;
});

// CORS middleware - DEBE IR ANTES del routing
$app->add(function ($request, $handler) {
    $response = $handler->handle($request);
    $origin = $request->getHeaderLine('Origin');
    
    // Si no hay Origin, permitir cualquier origen
    if (empty($origin)) {
        $origin = '*';
    }

    return $response
        ->withHeader('Access-Control-Allow-Origin', $origin)
        ->withHeader('Access-Control-Allow-Credentials', 'true')
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        ->withHeader('Access-Control-Max-Age', '3600');
});

// Manejar preflight requests (OPTIONS) - Devolver 200 OK con headers CORS
$app->options('/{routes:.+}', function ($request, $response) {
    // Los headers ya fueron agregados por el middleware
    return $response->withStatus(200);
});

// Helper JWT
function verifyJwtFromHeader($request)
{
    $header = $request->getHeaderLine('Authorization');
    if (!$header) return null;
    if (!preg_match('/Bearer\s+(.*)$/i', $header, $matches)) return null;
    $token = $matches[1];
    try {
        $secret = getenv('JWT_SECRET') ?: 'TU_SECRETO_MUY_SEGURO';
        $decoded = JWT::decode($token, new Key($secret, 'HS256'));
        return (array) $decoded;
    } catch (\Throwable $e) {
        return null;
    }
}

// Rutas de autenticación
$controller = new SolicitudController();
$app->post('/api/login', [$controller, 'login']);
$app->post('/api/login/select', [$controller, 'selectAccount']);

// Rutas de recuperación de contraseña
$app->post('/api/password/request', [$controller, 'requestPasswordReset']);
$app->post('/api/password/verify', [$controller, 'verifyResetCode']);
$app->post('/api/password/reset', [$controller, 'resetPassword']);

// Perfil del usuario autenticado con programa (si existe)
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
                                   p.nombre_programa,p.numero_ficha,p.nivel,p.centro_formacion
                            FROM usuarios u
                            LEFT JOIN roles r ON u.id_rol = r.id_rol
                            LEFT JOIN programas_formacion p ON u.id_programa = p.id_programa
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

// Obtener lista de roles
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

// Rutas de Administrador
$adminRoutes = require __DIR__ . '/../admin/routes.php';
$adminRoutes($app);

// Rutas de Aprendiz
$aprendizRoutes = require __DIR__ . '/../aprendiz/routes.php';
$aprendizRoutes($app);

// Rutas de Instructor
$instructorRoutes = require __DIR__ . '/../instructor/routes.php';
$instructorRoutes($app);

// Rutas de Cron (expiración automática)
$cronRoutes = require __DIR__ . '/../cron/routes.php';
$cronRoutes($app);

// Rutas de Coordinación
$coordinacionRoutes = require __DIR__ . '/../coordinacion/routes.php';
$coordinacionRoutes($app);

// Rutas de Vigilante
$vigilanteRoutes = require __DIR__ . '/../vigilante/routes.php';
$vigilanteRoutes($app);

$app->run();