@echo off
echo ====================================
echo SENA - Expirar Solicitudes
echo ====================================
echo.
echo Ejecutando script de expiracion...
echo.

cd /d "%~dp0"
php expirar_solicitudes.php

echo.
echo ====================================
echo Ejecucion completada
echo ====================================
echo.

timeout /t 3
