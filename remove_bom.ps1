$file = 'c:\xampp\htdocs\SalidaSENA\backend\aprendiz\routes.php'
$content = Get-Content $file -Raw
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
Write-Host 'BOM removed successfully from routes.php'
