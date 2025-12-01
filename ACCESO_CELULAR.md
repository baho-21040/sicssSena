# 📱 Guía para Acceder desde tu Celular

## Tu IP Local
**IP de tu computadora:** `10.9.51.155`

---

## Pasos para Acceder desde tu Celular

### 1. Asegúrate que tu celular esté en la misma red WiFi

Tu celular debe estar conectado a la **misma red WiFi** que tu computadora.

### 2. Detén el servidor actual

En la terminal donde está corriendo `npm run dev`, presiona:
```
Ctrl + C
```

### 3. Inicia el servidor con acceso de red

Ejecuta este comando:
```bash
npm run dev
```

El archivo `vite.config.js` ya está configurado para aceptar conexiones de red.

### 4. Accede desde tu celular

Abre el navegador de tu celular y ve a:

**Frontend:**
```
http://10.9.51.155:5173
```

**Backend (XAMPP):**
El backend ya está accesible en:
```
http://10.9.51.155/SalidaSENA/backend/public
```

---

## URLs Completas para tu Celular

### Página de Login
```
http://10.9.51.155:5173
```

### API Backend
```
http://10.9.51.155/SalidaSENA/backend/public/api
```

---

## Configurar el .env

Asegúrate que tu archivo `.env` en el frontend tenga:

```env
VITE_API_BASE_URL=http://10.9.51.155/SalidaSENA/backend/public
```

**⚠️ IMPORTANTE:** Después de cambiar el `.env`, debes **reiniciar el servidor de desarrollo**:

1. Presiona `Ctrl + C` en la terminal donde está corriendo `npm run dev`
2. Ejecuta nuevamente `npm run dev`

Vite solo lee las variables de entorno al iniciar, no detecta cambios automáticamente.

---

## ⚠️ CONFIGURACIÓN CRÍTICA: XAMPP debe permitir acceso de red

Por defecto, XAMPP solo acepta conexiones desde `localhost`. Para que tu celular pueda conectarse al backend, necesitas modificar la configuración de Apache:

### Opción 1: Modificar httpd-xampp.conf (Recomendado)

1. Abre el Panel de Control de XAMPP
2. Haz clic en **Config** junto a Apache → **httpd-xampp.conf**
3. Busca todas las líneas que digan `Require local`
4. Cámbialas por:
   ```apache
   Require local
   Require ip 10.9.51
   ```
5. Guarda el archivo
6. **Reinicia Apache** desde el Panel de Control de XAMPP

### Opción 2: Verificar que el .htaccess esté funcionando

El proyecto ya tiene un archivo `.htaccess` en `backend/public/` que permite acceso desde la red. Asegúrate de que Apache tenga habilitado `mod_rewrite` y `AllowOverride All`.

**Ver guía completa:** [Configurar XAMPP para Red](file:///C:/Users/USUARIO%20TS/.gemini/antigravity/brain/110e28ab-9874-477e-9fbe-431f3a95b29e/configurar_xampp_red.md)



## Verificar Firewall de Windows

Si no puedes acceder, puede ser el firewall. Ejecuta como administrador:

```powershell
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173
```

O desactiva temporalmente el firewall para probar.

---

## Solución de Problemas

### No puedo acceder desde el celular

1. **Verifica la IP:**
   ```bash
   ipconfig
   ```
   Busca la IP que empieza con `10.` o `192.168.`

2. **Verifica que el servidor esté corriendo:**
   Deberías ver en la terminal:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://10.9.51.155:5173/
   ```

3. **Verifica la red WiFi:**
   - Celular y PC deben estar en la misma red
   - Algunas redes públicas bloquean conexiones entre dispositivos

4. **Firewall:**
   - Desactiva temporalmente el firewall de Windows
   - O agrega una excepción para el puerto 5173

---

## Comandos Rápidos

**Ver tu IP:**
```bash
ipconfig | findstr /i "IPv4"
```

**Reiniciar servidor:**
```bash
npm run dev
```

**Verificar puerto:**
```bash
netstat -ano | findstr :5173
```
