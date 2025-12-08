<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

function enviarCorreoAprendiz($emailAprendiz, $nombreAprendiz, $etapa, $estado, $descripcionSolicitud = '', $motivoRechazo = null) {
    // $etapa: 'INSTRUCTOR' o 'COORDINACION'
    // $estado: 'Aprobada' o 'Rechazada'

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
        // Asumiendo credenciales globales
        $mail->Username   = 'informate.florencia2024@gmail.com'; 
        $mail->Password   = 'lptfpvknlygrkjgf'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // --- Remitente y Destinatario ---
        $mail->setFrom('informate.florencia2024@gmail.com', 'Sistema de Gestión de Accesos – Sicss SENA');
        
        $mail->addAddress($emailAprendiz, $nombreAprendiz);

        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';

        // --- Lógica del Contenido ---
        $subject = '';
        $bodyContent = '';

        if ($etapa === 'INSTRUCTOR') {
            $subject = 'Estado de su Solicitud de Salida';
            
            $motivoRechazoHtml = '';
            if ($estado === 'Rechazada' && $motivoRechazo) {
                $motivoRechazoHtml = "<p><strong>Motivo de rechazo:</strong> $motivoRechazo</p>";
            }

            $mensajeExtra = '';
            if ($estado === 'Aprobada') {
                $mensajeExtra = '<p>(En caso de haber sido aprobada) Su solicitud ha sido remitida automáticamente al área de Coordinación Académica para el proceso correspondiente.</p>';
            } else {
                $mensajeExtra = '<p>(En caso de haber sido rechazada) La solicitud se da por finalizada según la justificación previamente mencionada.</p>';
            }

            $bodyContent = <<<HTML
                <div class="greeting">Estimado(a) Aprendiz $nombreAprendiz,</div>
                
                <p>Le informamos que su solicitud de salida, registrada en el sistema institucional, ha sido revisada por su instructor(a).</p>
                
                <p><strong>Detalle de la solicitud:</strong> $descripcionSolicitud</p>

                <div class="info-box">
                    <strong>Estado de la solicitud:</strong> $estado
                    $motivoRechazoHtml
                </div>

                $mensajeExtra

                <p>Lo invitamos a ingresar a Sicss SENA para consultar el estado actualizado de su solicitud.</p>
HTML;

        } elseif ($etapa === 'COORDINACION') {
            $subject = 'Decisión Final de Coordinación sobre su Solicitud de Salida';

            $motivoRechazoHtml = '';
            if ($estado === 'Rechazada' && $motivoRechazo) {
                $motivoRechazoHtml = "<p><strong>Motivo indicado por Coordinación:</strong> $motivoRechazo</p>";
            }

            $mensajeExtra = '';
            if ($estado === 'Aprobada') {
                $mensajeExtra = <<<HTML
                <p>El sistema ha generado automáticamente su código QR de salida.<br>
                Podrá visualizarlo ingresando a la plataforma Sicss SENA.</p>
                <p>Una vez en portería, presente su código QR para que el vigilante realice el proceso de validación y escaneo que autoriza su salida del centro de formación.</p>
HTML;
            } else {
                $mensajeExtra = '<p>El proceso se da por finalizado según la justificación anteriormente mencionada.</p>';
            }

            $bodyContent = <<<HTML
                <div class="greeting">Estimado(a) Aprendiz $nombreAprendiz,</div>
                
                <p>Le informamos que su solicitud de salida ha sido revisada por el área de Coordinación Académica, luego de la aprobación previa por parte de su instructor(a).</p>
                
                <p>A continuación, encontrará el resultado final del proceso:</p>

                <div class="info-box">
                    <strong>Estado final de la solicitud:</strong> $estado
                    $motivoRechazoHtml
                </div>

                $mensajeExtra
HTML;
        }

        $mail->Subject = $subject;

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
                        $bodyContent
                        
                        <br>
                        <p>Cordialmente,<br><strong>Sistema de Gestión de Accesos – Sicss SENA</strong></p>
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
        $mail->AltBody = strip_tags(str_replace(['<br>', '</div>', '</p>'], ["\n", "\n", "\n"], $cuerpoCorreo));

        $mail->send();
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [SUCCESS] Correo ($etapa - $estado) enviado a aprendiz $emailAprendiz\n", FILE_APPEND);
        return true;

    } catch (Exception $e) {
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [ERROR] " . $mail->ErrorInfo . "\n", FILE_APPEND);
        return false;
    }
}
