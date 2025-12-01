$files = @(
    'c:\xampp\htdocs\SalidaSENA\backend\public\index.php',
    'c:\xampp\htdocs\SalidaSENA\backend\aprendiz\routes.php',
    'c:\xampp\htdocs\SalidaSENA\backend\config\conexion.php',
    'c:\xampp\htdocs\SalidaSENA\backend\config\jwt.php'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
        Write-Host "BOM removed from: $file"
    }
}

Write-Host "`nAll files processed successfully!"
