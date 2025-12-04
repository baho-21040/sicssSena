<?php
// Agregar Programa desde Coordinación


header('Content-Type: application/json');

$user = verifyJwtFromHeader($request);
if (!$user || !in_array($user['nombre_rol'] ?? '', ['Administrador', 'Coordinacion'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'No autorizado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$nombre_programa = $data['nombre_programa'] ?? '';
$nivel = $data['nivel'] ?? '';
$centro_formacion = $data['centro_formacion'] ?? '';
$numero_ficha = $data['numero_ficha'] ?? '';
$id_jornada = $data['id_jornada'] ?? '';

if (empty($nombre_programa) || empty($nivel) || empty($centro_formacion) || empty($numero_ficha) || empty($id_jornada)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Todos los campos son obligatorios']);
    exit;
}

try {
    $pdo = conexion();
    
    // Verificar si ya existe un programa con el mismo número de ficha
    $checkStmt = $pdo->prepare("SELECT id_programa FROM programas_formacion WHERE numero_ficha = ?");
    $checkStmt->execute([$numero_ficha]);
    if ($checkStmt->fetch()) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Ya existe un programa con ese número de ficha']);
        exit;
    }

    // Insertar el nuevo programa
    $stmt = $pdo->prepare("INSERT INTO programas_formacion (nombre_programa, nivel, centro_formacion, numero_ficha, id_jornada, estado) VALUES (?, ?, ?, ?, ?, 'Activo')");
    $stmt->execute([$nombre_programa, $nivel, $centro_formacion, $numero_ficha, $id_jornada]);

    http_response_code(201);
    echo json_encode(['status' => 'ok', 'message' => 'Programa registrado exitosamente', 'id' => $pdo->lastInsertId()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al registrar programa: ' . $e->getMessage()]);
}
