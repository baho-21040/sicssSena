# Configuración de Expiración Automática de Solicitudes

## 📋 Descripción

Sistema que rechaza automáticamente las solicitudes que llevan **más de 1 hora** sin ser aprobadas o rechazadas por el instructor.

**Motivo de rechazo:** "Tiempo de espera expirado"

---

## 🔧 Opción 1: Script PHP con Task Scheduler (Windows)

### Paso 1: Abrir Task Scheduler
1. Presiona `Win + R`
2. Escribe `taskschd.msc`
3. Presiona Enter

### Paso 2: Crear Nueva Tarea
1. Click derecho en "Biblioteca del Programador de tareas"
2. Selecciona "Crear tarea básica"

### Paso 3: Configurar Tarea
- **Nombre:** Expirar Solicitudes SENA
- **Descripción:** Rechaza automáticamente solicitudes con más de 1 hora
- **Desencadenador:** Diariamente
- **Repetir cada:** 5 minutos
- **Duración:** Indefinidamente

### Paso 4: Acción
- **Acción:** Iniciar un programa
- **Programa:** `C:\xampp\php\php.exe`
- **Argumentos:** `C:\xampp\htdocs\SalidaSENA\backend\cron\expirar_solicitudes.php`

### Paso 5: Configuración Avanzada
- ✅ Ejecutar aunque el usuario no haya iniciado sesión
- ✅ Ejecutar con los privilegios más altos
- ✅ Configurar para: Windows 10

---

## 🌐 Opción 2: Endpoint API (Alternativa)

Si no puedes configurar Task Scheduler, usa el endpoint API.

### URL del Endpoint
```
GET http://localhost/SalidaSENA/backend/public/api/cron/expirar-solicitudes?token=SENA_CRON_SECRET_2025
```

### Servicios Externos Recomendados

**1. UptimeRobot (Gratis)**
- URL: https://uptimerobot.com
- Configurar monitor HTTP cada 5 minutos
- URL: Tu endpoint público

**2. Cron-Job.org (Gratis)**
- URL: https://cron-job.org
- Configurar job cada 5 minutos
- URL: Tu endpoint público

**3. EasyCron (Gratis hasta 20 jobs)**
- URL: https://www.easycron.com
- Configurar cron cada 5 minutos

### Cambiar Token de Seguridad

**Archivo:** `backend/cron/routes.php`

```php
// Línea 13
$token_secreto = 'TU_TOKEN_SUPER_SECRETO_AQUI';
```

---

## 🧪 Probar Manualmente

### Opción 1: Ejecutar Script PHP
```bash
cd C:\xampp\htdocs\SalidaSENA\backend\cron
php expirar_solicitudes.php
```

### Opción 2: Llamar Endpoint
Abrir en navegador:
```
http://localhost/SalidaSENA/backend/public/api/cron/expirar-solicitudes?token=SENA_CRON_SECRET_2025
```

---

## 📊 Verificar Logs

**Archivo de log:** `backend/cron/expiracion.log`

Ejemplo de log:
```
[2025-11-25 00:30:00] === Iniciando proceso de expiración ===
[2025-11-25 00:30:00] Solicitudes expiradas encontradas: 3
[2025-11-25 00:30:00] Solicitud #15 rechazada automáticamente (75 minutos transcurridos)
[2025-11-25 00:30:00] Solicitud #16 rechazada automáticamente (90 minutos transcurridos)
[2025-11-25 00:30:00] Solicitud #17 rechazada automáticamente (120 minutos transcurridos)
[2025-11-25 00:30:00] Solicitudes rechazadas exitosamente: 3 de 3
[2025-11-25 00:30:00] === Proceso finalizado ===
```

---

## ⚙️ Configuración Avanzada

### Cambiar Tiempo de Expiración

**Script PHP:** `backend/cron/expirar_solicitudes.php`
```php
// Línea 14
$TIEMPO_EXPIRACION_HORAS = 1; // Cambiar a 2, 3, etc.
```

**Endpoint API:** `backend/cron/routes.php`
```php
// Línea 22
$TIEMPO_EXPIRACION_HORAS = 1; // Cambiar a 2, 3, etc.
```

---

## 🔍 Solución de Problemas

### El script no se ejecuta
1. Verificar que PHP esté en el PATH
2. Verificar permisos de ejecución
3. Revisar logs de Task Scheduler

### El endpoint retorna error
1. Verificar que el token sea correcto
2. Verificar conexión a base de datos
3. Revisar logs de PHP

### No se rechazan solicitudes
1. Verificar que existan solicitudes con más de 1 hora
2. Verificar estado: debe ser "Pendiente Instructor"
3. Revisar log de expiración

---

## 📝 Notas Importantes

- ⏰ **Frecuencia recomendada:** Cada 5-10 minutos
- 🔒 **Seguridad:** Cambiar token en producción
- 📊 **Monitoreo:** Revisar logs periódicamente
- 🗄️ **Base de datos:** No elimina registros, solo cambia estado
