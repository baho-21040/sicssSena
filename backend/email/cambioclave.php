<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../vendor/autoload.php';

function enviarCodigoCambioClave($emailDestino, $nombreUsuario, $codigoRecuperacion) {
    $mail = new PHPMailer(true);
    $logFile = __DIR__ . '/../email_debug.log';

    // URL del Logo SENA
    $logoUrl = "https://oficinavirtualderadicacion.sena.edu.co/oficinavirtual/Resources/logoSenaNaranja.png"; 

    try {
        // --- Configuración del servidor SMTP ---
        $mail->SMTPDebug = 0;
        $mail->Debugoutput = function($str, $level) use ($logFile) {
            file_put_contents($logFile, date('Y-m-d H:i:s') . " [$level] $str\n", FILE_APPEND);
        };

        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com'; 
        $mail->SMTPAuth   = true;
        $mail->Username   = 'informate.florencia2024@gmail.com'; 
        $mail->Password   = 'lptfpvknlygrkjgf';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // --- Remitente y Destinatario ---
        $mail->setFrom('informate.florencia2024@gmail.com', 'SICSS SENA Notificaciones');
        $mail->addAddress($emailDestino, $nombreUsuario);

        // --- Contenido del Correo ---
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = 'Código de Recuperación de Contraseña - SICSS SENA';
        
        $cuerpoCorreo = <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f4f4f4; 
                }
                .email-wrapper { 
                    width: 100%; 
                    background-color: #f4f4f4; 
                    padding: 40px 0; 
                }
                .email-container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background-color: #ffffff; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
                    overflow: hidden; 
                }
                .header { 
                    background: linear-gradient(135deg, #39A900 0%, #2d8500 100%);
                    padding: 30px 20px; 
                    text-align: center; 
                }
                .header img { 
                    max-height: 80px; 
                    background: white; 
                    padding: 10px; 
                    border-radius: 50%; 
                }
                .header h1 { 
                    color: #ffffff; 
                    margin: 15px 0 0 0; 
                    font-size: 24px; 
                    letter-spacing: 1px; 
                }
                .content { 
                    padding: 40px 30px; 
                    color: #333333; 
                    line-height: 1.6; 
                }
                .greeting { 
                    font-size: 20px; 
                    font-weight: bold; 
                    margin-bottom: 20px; 
                    color: #333; 
                }
                .code-box { 
                    margin: 30px 0; 
                    padding: 30px; 
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border-radius: 8px; 
                    text-align: center;
                    border: 2px dashed #39A900;
                }
                .code-label { 
                    font-size: 14px; 
                    color: #666; 
                    text-transform: uppercase; 
                    letter-spacing: 2px; 
                    font-weight: bold; 
                    margin-bottom: 15px;
                }
                .code-value { 
                    font-size: 48px; 
                    font-weight: bold; 
                    color: #39A900; 
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
                }
                .warning-box {
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
                .warning-box p {
                    margin: 5px 0;
                    color: #856404;
                    font-size: 14px;
                }
                .timer-icon {
                    font-size: 18px;
                    vertical-align: middle;
                }
                .security-notice {
                    background-color: #f8d7da;
                    border-left: 4px solid #dc3545;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
                .security-notice p {
                    margin: 5px 0;
                    color: #721c24;
                    font-size: 14px;
                }
                .footer { 
                    background-color: #333333; 
                    color: #aaaaaa; 
                    text-align: center; 
                    padding: 20px; 
                    font-size: 12px; 
                }
                .footer a { 
                    color: #39A900; 
                    text-decoration: none; 
                }
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
                        
                        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el sistema SICSS SENA.</p>

                        <div class="code-box">
                            <div class="code-label">Tu código de recuperación es:</div>
                            <div class="code-value">$codigoRecuperacion</div>
                        </div>

                        <div class="warning-box">
                            <p><span class="timer-icon">⏱️</span> <strong>Este código es válido por 5 minutos.</strong></p>
                            <p>Ingresa el código en la pantalla de recuperación para continuar con el cambio de contraseña.</p>
                        </div>

                        <div class="security-notice">
                            <p><strong>⚠️ Aviso de Seguridad</strong></p>
                            <p>Si no solicitaste este cambio de contraseña, ignora este mensaje. Tu cuenta permanecerá segura.</p>
                            <p>Nunca compartas este código con nadie, ni siquiera con personal del SENA.</p>
                        </div>
                        
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
        $mail->AltBody = "Hola $nombreUsuario, tu código de recuperación de contraseña es: $codigoRecuperacion. Este código es válido por 5 minutos. Si no solicitaste este cambio, ignora este mensaje.";

        $mail->send();
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [SUCCESS] Código de recuperación enviado a $emailDestino\n", FILE_APPEND);
        return true;

    } catch (Exception $e) {
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [ERROR] " . $mail->ErrorInfo . "\n", FILE_APPEND);
        return false;
    }
}
