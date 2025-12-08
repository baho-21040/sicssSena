<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

function enviarCorreoInstructor($emailInstructor, $nombreInstructor, $nombreAprendiz, $documentoAprendiz, $programaAprendiz, $fichaAprendiz, $jornadaAprendiz, $descripcionSolicitud) {
    $mail = new PHPMailer(true);
    $logFile = __DIR__ . '/../../email_debug.log';

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
        // Asumiendo que estas credenciales son las mismas para todo el sistema
        $mail->Username   = 'informate.florencia2024@gmail.com'; 
        $mail->Password   = 'lptfpvknlygrkjgf'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // --- Remitente y Destinatario ---
        $mail->setFrom('informate.florencia2024@gmail.com', 'Sistema de Control de Ingresos y Salidas – Sicss SENA');
        $mail->addAddress($emailInstructor, $nombreInstructor);

        // --- Contenido del Correo ---
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = 'Aviso de Solicitud de Salida Registrada';
        
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
                .info-box { background-color: #f9f9f9; padding: 15px; border-left: 5px solid #39A900; margin-bottom: 20px; }
                .footer { background-color: #333333; color: #aaaaaa; text-align: center; padding: 20px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="email-container">
                    <div class="header">
                        <img src="$logoUrl" alt="Logo SENA">
                        <h1>SICSS SENA</h1>
                    </div>

                    <div class="content">
                        <div class="greeting">Estimado Instructor $nombreInstructor,</div>
                        
                        <p>Por medio de la presente se informa que el aprendiz <strong>$nombreAprendiz</strong>, con documento <strong>$documentoAprendiz</strong>, adscrito al programa <strong>$programaAprendiz</strong>, ficha <strong>$fichaAprendiz</strong>, en la jornada <strong>$jornadaAprendiz</strong>, ha generado una solicitud de salida mediante la plataforma institucional.</p>

                        <div class="info-box">
                            <strong>Detalle/Motivo de la solicitud:</strong><br>
                            $descripcionSolicitud
                        </div>

                        <p>Para dar continuidad al trámite, se solicita acceder a Sicss SENA, donde podrá aprobar o rechazar la solicitud según los protocolos establecidos.</p>
                        
                        <br>
                        <p>Atentamente,<br><strong>Sistema de Control de Ingresos y Salidas – Sicss SENA</strong></p>
                    </div>

                    <div class="footer">
                        <p>&copy; 2025 SICSS SENA - Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
HTML;

        $mail->Body = $cuerpoCorreo;
        $mail->AltBody = strip_tags(str_replace(['<br>', '</div>'], ["\n", "\n"], $cuerpoCorreo));

        $mail->send();
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [SUCCESS] Correo enviado a instructor $emailInstructor\n", FILE_APPEND);
        return true;

    } catch (Exception $e) {
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [ERROR] " . $mail->ErrorInfo . "\n", FILE_APPEND);
        return false;
    }
}
