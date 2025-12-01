# ⚡ Configuración Rápida - Expiración Automática

## ✅ El Script Funciona Correctamente

Acabo de ejecutar el script manualmente y **rechazó 4 solicitudes** exitosamente.

El problema es que necesitas configurarlo para que se ejecute **automáticamente cada 5 minutos**.

---

## 🚀 Opción 1: Configuración Automática (MÁS FÁCIL)

### Paso 1: Ejecutar como Administrador

1. Ve a la carpeta: `C:\xampp\htdocs\SalidaSENA\backend\cron\`
2. Haz **clic derecho** en `configurar_tarea.bat`
3. Selecciona **"Ejecutar como administrador"**
4. Espera el mensaje de confirmación

✅ ¡Listo! La tarea se ejecutará automáticamente cada 5 minutos.

---

## 🔧 Opción 2: Configuración Manual

### Paso 1: Abrir Task Scheduler
1. Presiona `Win + R`
2. Escribe: `taskschd.msc`
3. Presiona Enter

### Paso 2: Crear Tarea
1. Click en **"Crear tarea básica"**
2. Nombre: `SENA_Expirar_Solicitudes`
3. Descripción: `Rechaza solicitudes con más de 1 hora`

### Paso 3: Desencadenador
1. Selecciona: **"Diariamente"**
2. Hora de inicio: **Ahora**
3. Click en **"Repetir la tarea cada"**: **5 minutos**
4. Durante: **Indefinidamente**

### Paso 4: Acción
1. Selecciona: **"Iniciar un programa"**
2. Programa: `C:\xampp\php\php.exe`
3. Argumentos: `C:\xampp\htdocs\SalidaSENA\backend\cron\expirar_solicitudes.php`

### Paso 5: Finalizar
1. Click en **"Finalizar"**
2. ✅ La tarea está configurada

---

## 🧪 Verificar que Funciona

### Ver Logs
Abre el archivo: `C:\xampp\htdocs\SalidaSENA\backend\cron\expiracion.log`

Deberías ver algo como:
```
[2025-11-25 12:13:58] === Iniciando proceso de expiración ===
[2025-11-25 12:13:58] Solicitudes expiradas encontradas: 4
[2025-11-25 12:13:58] Solicitud #X rechazada automáticamente
[2025-11-25 12:13:58] Solicitudes rechazadas exitosamente: 4 de 4
[2025-11-25 12:13:58] === Proceso finalizado ===
```

### Ver Tarea en Task Scheduler
1. Abre Task Scheduler
2. Busca: `SENA_Expirar_Solicitudes`
3. Verifica que esté **"En ejecución"** o **"Listo"**

---

## 🔄 Alternativa: Endpoint API

Si no quieres usar Task Scheduler, puedes usar un servicio externo:

### UptimeRobot (Gratis)
1. Regístrate en: https://uptimerobot.com
2. Crea un monitor HTTP
3. URL: `http://TU_IP/SalidaSENA/backend/public/api/cron/expirar-solicitudes?token=SENA_CRON_SECRET_2025`
4. Intervalo: 5 minutos

---

## ❓ Solución de Problemas

### La tarea no se ejecuta
- Verifica que Task Scheduler esté activo
- Ejecuta el script manualmente para ver errores
- Revisa los logs

### Ejecutar Manualmente
```bash
cd C:\xampp\htdocs\SalidaSENA\backend\cron
php expirar_solicitudes.php
```

---

## 📊 Resultado de la Última Ejecución

```json
{
  "status": "ok",
  "total_encontradas": 4,
  "total_rechazadas": 4,
  "timestamp": "2025-11-25 12:13:58"
}
```

✅ **4 solicitudes fueron rechazadas automáticamente** porque tenían más de 1 hora sin respuesta.
