<?php
// Buscar Programas desde Coordinación


header('Content-Type: application/json');

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'No autorizado']);
    exit;
}

$q = $_GET['q'] ?? '';
$estado = $_GET['estado'] ?? '';
$nivel = $_GET['nivel'] ?? '';

try {
    $pdo = conexion();
    $sql = "SELECT p.*, j.nombre_jornada 
            FROM programas_formacion p
            LEFT JOIN jornadas j ON p.id_jornada = j.id_jornada";

    $conditions = [];
    $bindings = [];

    if (!empty($q)) {
        $conditions[] = "(p.nombre_programa LIKE :q OR p.numero_ficha LIKE :q)";
        $bindings[':q'] = '%' . $q . '%';
    }

    if (!empty($estado) && $estado !== 'todos') {
        $conditions[] = "LOWER(p.estado) = :estado";
        $bindings[':estado'] = strtolower($estado);
    }

    if (!empty($nivel) && $nivel !== 'todos') {
        $conditions[] = "LOWER(p.nivel) = :nivel";
        $bindings[':nivel'] = strtolower($nivel);
    }

    if (!empty($conditions)) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
    }

    $sql .= " ORDER BY p.id_programa DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bindings);

    $programas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode(['status' => 'ok', 'programas' => $programas]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al buscar programas']);
}
