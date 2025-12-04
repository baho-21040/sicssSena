<?php
// backend/vigilante/perfil/editarperfil.php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

function getPerfilVigilante(Request $request, Response $response) {
    $userData = verifyJwtFromHeader($request);
    if (!$userData || !isset($userData['sub'])) {
        $payload = ['status' => 'error', 'message' => 'Token inválido o expirado'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
    $id_usuario = $userData['sub'];
    $pdo = conexion();

    try {
        $sql = "SELECT u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.documento, u.correo, r.nombre_rol 
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.id_usuario = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id_usuario]);
        $perfil = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($perfil) {
            $payload = ['status' => 'ok', 'perfil' => $perfil];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        } else {
            $payload = ['status' => 'error', 'message' => 'Usuario no encontrado'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }
    } catch (PDOException $e) {
        $payload = ['status' => 'error', 'message' => 'Error de base de datos: ' . $e->getMessage()];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
}

function actualizarCorreoVigilante(Request $request, Response $response) {
    $userData = verifyJwtFromHeader($request);
    if (!$userData || !isset($userData['sub'])) {
        $payload = ['status' => 'error', 'message' => 'Token inválido o expirado'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
    $id_usuario = $userData['sub'];
    $data = $request->getParsedBody();
    $nuevo_correo = $data['nuevo_correo'] ?? '';

    if (empty($nuevo_correo) || !filter_var($nuevo_correo, FILTER_VALIDATE_EMAIL)) {
        $payload = ['status' => 'error', 'message' => 'Correo inválido'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $pdo = conexion();

    try {
        // Verificar si el correo ya existe en otro usuario
        $sqlCheck = "SELECT id_usuario FROM usuarios WHERE correo = :correo AND id_usuario != :id";
        $stmtCheck = $pdo->prepare($sqlCheck);
        $stmtCheck->execute([':correo' => $nuevo_correo, ':id' => $id_usuario]);
        
        if ($stmtCheck->fetch()) {
            $payload = ['status' => 'error', 'message' => 'El correo ya está en uso por otro usuario'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $sqlUpdate = "UPDATE usuarios SET correo = :correo WHERE id_usuario = :id";
        $stmtUpdate = $pdo->prepare($sqlUpdate);
        $stmtUpdate->execute([':correo' => $nuevo_correo, ':id' => $id_usuario]);

        $payload = ['status' => 'ok', 'message' => 'Correo actualizado correctamente'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (PDOException $e) {
        $payload = ['status' => 'error', 'message' => 'Error al actualizar correo: ' . $e->getMessage()];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
}

function cambiarContrasenaVigilante(Request $request, Response $response) {
    $userData = verifyJwtFromHeader($request);
    if (!$userData || !isset($userData['sub'])) {
        $payload = ['status' => 'error', 'message' => 'Token inválido o expirado'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
    $id_usuario = $userData['sub'];
    $data = $request->getParsedBody();
    $contrasena_actual = $data['contrasena_actual'] ?? '';
    $contrasena_nueva = $data['contrasena_nueva'] ?? '';

    if (empty($contrasena_actual) || empty($contrasena_nueva)) {
        $payload = ['status' => 'error', 'message' => 'Faltan datos'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $pdo = conexion();

    try {
        $sql = "SELECT contrasena FROM usuarios WHERE id_usuario = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id_usuario]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario || !password_verify($contrasena_actual, $usuario['contrasena'])) {
            $payload = ['status' => 'error', 'message' => 'Contraseña actual incorrecta'];
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $hash_nueva = password_hash($contrasena_nueva, PASSWORD_DEFAULT);
        $sqlUpdate = "UPDATE usuarios SET contrasena = :contrasena WHERE id_usuario = :id";
        $stmtUpdate = $pdo->prepare($sqlUpdate);
        $stmtUpdate->execute([':contrasena' => $hash_nueva, ':id' => $id_usuario]);

        $payload = ['status' => 'ok', 'message' => 'Contraseña actualizada correctamente'];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (PDOException $e) {
        $payload = ['status' => 'error', 'message' => 'Error al cambiar contraseña: ' . $e->getMessage()];
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
}
