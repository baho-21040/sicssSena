<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../vendor/autoload.php';

function enviarCorreoEstadoCuenta($emailDestino, $nombreUsuario, $nuevoEstado) {
    $mail = new PHPMailer(true);
    $logFile = __DIR__ . '/../email_debug.log';

    // Lógica de colores y mensajes según el estado
    $colorEstado = ($nuevoEstado == 'Activo') ? '#39A900' : '#D9534F'; // Verde SENA o Rojo Alerta
    $colorFondoEstado = ($nuevoEstado == 'Activo') ? '#eaf7e4' : '#fdeded'; // Fondos suaves
    
    $mensajeDetalle = ($nuevoEstado == 'Activo') 
        ? '¡Excelentes noticias! Tu cuenta ha sido habilitada. Ahora tienes acceso completo a las herramientas de control y seguridad del sistema.' 
        : 'Tu acceso ha sido restringido temporalmente. Si consideras que esto es un error, por favor contacta al administrador del sistema SICSS.';

    // URL del Logo SENA (Puedes cambiarla por una ruta local de tu servidor si es pública)
    $logoUrl = "https://oficinavirtualderadicacion.sena.edu.co/oficinavirtual/Resources/logoSenaNaranja.png"; 

    try {
        // --- Configuración del servidor SMTP ---
        $mail->SMTPDebug = 0; // Recomendado en producción poner en 0, en desarrollo 2
        $mail->Debugoutput = function($str, $level) use ($logFile) {
            file_put_contents($logFile, date('Y-m-d H:i:s') . " [$level] $str\n", FILE_APPEND);
        };

        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com'; 
        $mail->SMTPAuth   = true;
        $mail->Username   = 'informate.florencia2024@gmail.com'; 
        $mail->Password   = 'lptfpvknlygrkjgf'; // OJO: Ver nota de seguridad abajo
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // --- Remitente y Destinatario ---
        // Cambiamos el nombre para que coincida con el proyecto
        $mail->setFrom('informate.florencia2024@gmail.com', 'SICSS SENA Notificaciones');
        $mail->addAddress($emailDestino, $nombreUsuario);

        // --- Contenido del Correo (Diseño Mejorado) ---
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8'; // Importante para tildes y ñ
        $mail->Subject = 'Novedad en tu cuenta - SICSS SENA';
        
        // Usamos Heredoc (<<<HTML) para un código más limpio
        $cuerpoCorreo = <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
                .email-wrapper { width: 100%; background-color: #f4f4f4; padding: 40px 0; }
                .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background-color: #39A900; padding: 30px 20px; text-align: center; }
                .header img { max-height: 80px; background: white; padding: 10px; border-radius: 50%; }
                .header h1 { color: #ffffff; margin: 15px 0 0 0; font-size: 24px; letter-spacing: 1px; }
                .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
                .greeting { font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #333; }
                .status-box { margin: 30px 0; padding: 20px; border-left: 5px solid $colorEstado; background-color: $colorFondoEstado; border-radius: 4px; }
                .status-label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
                .status-value { font-size: 28px; font-weight: bold; color: $colorEstado; margin-top: 5px; display: block; }
                .footer { background-color: #333333; color: #aaaaaa; text-align: center; padding: 20px; font-size: 12px; }
                .footer a { color: #39A900; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="email-container">
                    <div class="header">
                        <img src="$logoUrl" alt="Logo SENA">
                        <h1>SICSS SENA</h1>
                        <p style="color: #e0e0e0; margin: 5px 0 0 0; font-size: 14px;">Sistema Integrado de Control, Seguridad y Salidas</p>
                    </div>

                    <div class="content">
                        <div class="greeting">Hola, $nombreUsuario</div>
                        
                        <p>Te informamos que se ha generado una actualización importante en el estado de tu cuenta dentro de la plataforma.</p>

                        <div class="status-box">
                            <span class="status-label">Nuevo Estado:</span>
                            <span class="status-value">$nuevoEstado</span>
                        </div>

                        <p>$mensajeDetalle</p>
                        
                        <br>
                        <p>Atentamente,<br><strong>El equipo de Seguridad SICSS</strong></p>
                    </div>

                    <div class="footer">
                        <p>&copy; 2025 SICSS SENA - Todos los derechos reservados.</p>
                        <p>Este es un mensaje automático, por favor no responder a este correo.</p>
                        <p>Florencia, Caquetá</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
HTML;

        $mail->Body = $cuerpoCorreo;
        $mail->AltBody = "Hola $nombreUsuario, tu estado de cuenta en SICSS SENA ha cambiado a: $nuevoEstado. $mensajeDetalle";

        $mail->send();
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [SUCCESS] Correo enviado a $emailDestino\n", FILE_APPEND);
        return true;

    } catch (Exception $e) {
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [ERROR] " . $mail->ErrorInfo . "\n", FILE_APPEND);
        return false;
    }
}