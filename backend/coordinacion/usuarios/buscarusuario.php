<?php
// Buscar Usuarios desde Coordinación


header('Content-Type: application/json');

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'No autorizado']);
    exit;
}

$q = $_GET['q'] ?? '';
$estado = $_GET['estado'] ?? '';
$rol = $_GET['rol'] ?? '';

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

    http_response_code(200);
    echo json_encode(['status' => 'ok', 'usuarios' => $usuarios]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al buscar usuarios']);
}
