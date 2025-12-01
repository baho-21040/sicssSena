<?php

function conexion() {
    $server = "localhost";   
    $usuario = "root";       
    $pass = "";              
    $basedatos = "bd_controlsalida"; 

    try {
        $pdo = new PDO("mysql:host=$server;dbname=$basedatos;charset=utf8", $usuario, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;

    } catch (PDOException $e) {
        error_log("❌ Error de conexión a BD: " . $e->getMessage());
        throw new Exception("Error de conexión a la base de datos: " . $e->getMessage());
    }
}
