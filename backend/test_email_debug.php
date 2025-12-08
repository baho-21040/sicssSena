<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "Iniciando prueba de correos...\n";

// Definir variables dummy
$emailDestino = "informate.florencia2024@gmail.com"; // Usar el mismo para probar si llega
$nombrePrueba = "Usuario Prueba";

// 1. Probar notificarinstructor.php
echo "Probando notificarinstructor.php...\n";
try {
    require_once __DIR__ . '/email/solicitud/notificarinstructor.php';
    echo "Archivo incluido.\n";
    if (function_exists('enviarCorreoInstructor')) {
        echo "Funcion encontrada. Enviando...\n";
        $res = enviarCorreoInstructor($emailDestino, "Instructor Test", "Aprendiz Test", "12345", "ADSO", "21040", "Diurna", "Prueba Motivo");
        echo "Resultado Instructor: " . ($res ? 'OK' : 'FAIL') . "\n";
    } else {
        echo "ERROR: Funcion enviarCorreoInstructor no existe.\n";
    }
} catch (Throwable $e) {
    echo "EXCEPCION en Instructor: " . $e->getMessage() . "\n";
}

echo "---------------------------------------------------\n";

// 2. Probar notificarcoordinacion.php
echo "Probando notificarcoordinacion.php...\n";
try {
    require_once __DIR__ . '/email/solicitud/notificarcoordinacion.php';
    echo "Archivo incluido.\n";
    if (function_exists('enviarCorreoCoordinacion')) {
        echo "Funcion encontrada. Enviando...\n";
        $res = enviarCorreoCoordinacion($emailDestino, "Aprendiz Test", "12345", "ADSO", "21040", "Diurna", "Instructor Test", "54321", "Prueba Motivo");
        echo "Resultado Coordinacion: " . ($res ? 'OK' : 'FAIL') . "\n";
    } else {
        echo "ERROR: Funcion enviarCorreoCoordinacion no existe.\n";
    }
} catch (Throwable $e) {
    echo "EXCEPCION en Coordinacion: " . $e->getMessage() . "\n";
}

echo "---------------------------------------------------\n";

// 3. Probar notificaraprendiz.php
echo "Probando notificaraprendiz.php...\n";
try {
    require_once __DIR__ . '/email/solicitud/notificaraprendiz.php';
    echo "Archivo incluido.\n";
    if (function_exists('enviarCorreoAprendiz')) {
        echo "Funcion encontrada. Enviando...\n";
        $res = enviarCorreoAprendiz($emailDestino, "Aprendiz Test", "INSTRUCTOR", "Aprobada");
        echo "Resultado Aprendiz: " . ($res ? 'OK' : 'FAIL') . "\n";
    } else {
        echo "ERROR: Funcion enviarCorreoAprendiz no existe.\n";
    }
} catch (Throwable $e) {
    echo "EXCEPCION en Aprendiz: " . $e->getMessage() . "\n";
}
