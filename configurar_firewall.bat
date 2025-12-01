@echo off
echo ========================================
echo Configurando Firewall para XAMPP y Vite
echo ========================================
echo.

REM Verificar si se está ejecutando como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Este script debe ejecutarse como Administrador
    echo.
    echo Haz clic derecho en este archivo y selecciona "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo [1/2] Agregando regla de firewall para Apache (Puerto 80)...
netsh advfirewall firewall add rule name="Apache HTTP" dir=in action=allow protocol=TCP localport=80

if %errorLevel% equ 0 (
    echo     OK: Regla para Apache agregada
) else (
    echo     ADVERTENCIA: No se pudo agregar la regla (puede que ya exista)
)

echo.
echo [2/2] Agregando regla de firewall para Vite (Puerto 5173)...
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173

if %errorLevel% equ 0 (
    echo     OK: Regla para Vite agregada
) else (
    echo     ADVERTENCIA: No se pudo agregar la regla (puede que ya exista)
)

echo.
echo ========================================
echo CONFIGURACION COMPLETA
echo ========================================
echo.
echo Ahora puedes acceder desde tu celular a:
echo   Frontend: http://192.168.1.66:5173
echo   Backend:  http://192.168.1.66/SalidaSENA/backend/public/api
echo.
echo IMPORTANTE: Asegurate de que Apache este corriendo en XAMPP
echo.
pause
