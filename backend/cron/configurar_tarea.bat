@echo off
REM Script para configurar Task Scheduler automáticamente
REM Ejecutar como Administrador

echo ====================================
echo Configurando Tarea de Expiracion
echo ====================================
echo.

REM Crear tarea programada
schtasks /create /tn "SENA_Expirar_Solicitudes" /tr "C:\xampp\php\php.exe C:\xampp\htdocs\SalidaSENA\backend\cron\expirar_solicitudes.php" /sc minute /mo 5 /ru SYSTEM /f

if %errorlevel% equ 0 (
    echo.
    echo [OK] Tarea creada exitosamente!
    echo.
    echo La tarea se ejecutara cada 5 minutos automaticamente.
    echo.
    echo Para verificar, abre Task Scheduler y busca: SENA_Expirar_Solicitudes
    echo.
) else (
    echo.
    echo [ERROR] No se pudo crear la tarea.
    echo Asegurate de ejecutar este script como Administrador.
    echo.
)

pause
