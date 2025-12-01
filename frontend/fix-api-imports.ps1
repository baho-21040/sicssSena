# Script para actualizar imports de API_BASE_URL
Write-Host "Actualizando archivos para usar API_BASE_URL desde config/api.js..." -ForegroundColor Green

# Lista de archivos a actualizar
$archivos = @(
    "src\pages\coordinacion\index.jsx",
    "src\pages\aprendiz\solicitud.jsx",
    "src\pages\aprendiz\espera.jsx",
    "src\pages\admin\usuario\registrar.jsx",
    "src\pages\admin\usuario\editarusuario.jsx",
    "src\pages\admin\usuario\editarusuario_backup.jsx"
)

foreach ($archivo in $archivos) {
    $rutaCompleta = Join-Path $PSScriptRoot $archivo
    
    if (Test-Path $rutaCompleta) {
        Write-Host "Procesando: $archivo" -ForegroundColor Yellow
        
        # Leer el contenido
        $contenido = Get-Content $rutaCompleta -Raw -Encoding UTF8
        
        # Determinar el nivel de navegación según la ubicación del archivo
        $niveles = ($archivo.Split('\') | Where-Object { $_ -ne "src" }).Count - 1
        $rutaConfig = "../" * $niveles + "config/api.js"
        
        # Buscar la línea que define API
        if ($contenido -match "const API = import\.meta\.env\.VITE_API_BASE_URL;") {
            # Reemplazar con el import y la constante
            $nuevoContenido = $contenido -replace "const API = import\.meta\.env\.VITE_API_BASE_URL;", "import { API_BASE_URL } from '$rutaConfig';`r`n`r`nconst API = API_BASE_URL;"
            
            # Guardar el archivo
            $nuevoContenido | Set-Content $rutaCompleta -Encoding UTF8 -NoNewline
            Write-Host "  ✓ Actualizado correctamente" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ No se encontró el patrón a reemplazar" -ForegroundColor Red
        }
    } else {
        Write-Host "  ✗ Archivo no encontrado: $rutaCompleta" -ForegroundColor Red
    }
}

Write-Host "`n✓ Proceso completado!" -ForegroundColor Green
Write-Host "Recarga el navegador para ver los cambios." -ForegroundColor Cyan
