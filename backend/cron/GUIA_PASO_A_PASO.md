# 📖 Guía Paso a Paso - Configuración Automática

## ¿Qué vamos a hacer?

Vamos a configurar Windows para que ejecute automáticamente el script cada 5 minutos.

---

## 🎯 PASO 1: Abrir el Explorador de Archivos

1. Presiona las teclas `Windows + E` en tu teclado
   - O haz clic en el ícono de carpeta en la barra de tareas

---

## 📂 PASO 2: Navegar a la Carpeta

1. En la barra de dirección (arriba), escribe o pega:
   ```
   C:\xampp\htdocs\SalidaSENA\backend\cron
   ```

2. Presiona `Enter`

3. Deberías ver varios archivos, entre ellos uno llamado:
   ```
   configurar_tarea.bata
   ```

---

## 🖱️ PASO 3: Ejecutar el Archivo

1. **Busca el archivo** `configurar_tarea.bat` en la carpeta
   - Es un archivo con ícono de engranajes o ventana de comandos

2. **Haz clic derecho** sobre ese archivo
   - Aparecerá un menú

3. **Selecciona** la opción que dice:
   ```
   Ejecutar como administrador
   ```
   - Es importante que sea "como administrador", NO solo "Abrir"

4. **Si aparece un mensaje** preguntando "¿Deseas permitir que esta aplicación haga cambios?"
   - Haz clic en **"Sí"**

---

## ✅ PASO 4: Verificar que Funcionó

1. Debería aparecer una **ventana negra** (consola) con texto

2. Deberías ver un mensaje que dice:
   ```
   [OK] Tarea creada exitosamente!
   
   La tarea se ejecutara cada 5 minutos automaticamente.
   ```

3. Presiona cualquier tecla para cerrar la ventana

---

## 🎉 ¡Listo!

Ahora el sistema rechazará automáticamente las solicitudes con más de 1 hora cada 5 minutos.

---

## 🔍 ¿Cómo Verificar que Está Funcionando?

### Opción 1: Ver el archivo de log

1. Ve a la misma carpeta: `C:\xampp\htdocs\SalidaSENA\backend\cron`
2. Abre el archivo `expiracion.log` con el Bloc de notas
3. Deberías ver registros cada 5 minutos

### Opción 2: Ver en Task Scheduler

1. Presiona `Windows + R`
2. Escribe: `taskschd.msc`
3. Presiona Enter
4. Busca una tarea llamada: `SENA_Expirar_Solicitudes`
5. Debería estar en estado "Listo" o "En ejecución"

---

## ❌ ¿Qué hacer si sale error?

Si ves un mensaje de error que dice:
```
[ERROR] No se pudo crear la tarea.
Asegurate de ejecutar este script como Administrador.
```

**Solución:**
1. Cierra la ventana
2. Repite el PASO 3, pero asegúrate de hacer clic derecho y seleccionar **"Ejecutar como administrador"**
3. NO selecciones solo "Abrir"

---

## 📞 ¿Necesitas Ayuda?

Si después de seguir estos pasos aún no funciona, dime:
1. ¿Qué mensaje viste en la ventana negra?
2. ¿Apareció algún error?
3. ¿Pudiste encontrar el archivo `configurar_tarea.bat`?
