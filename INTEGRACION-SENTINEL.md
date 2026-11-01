# ATLAS + SENTINEL V2

Esta versión conserva ATLAS V4 y agrega telemetría de autenticación hacia SENTINEL.

## Configuración

1. En SENTINEL V2, iniciar sesión, crear una aplicación `ATLAS` y generar una API key. Guardarla cuando aparezca.
2. En el `.env.local` **de ATLAS** conservar `DATABASE_URL`, `JWT_SECRET` y `CRON_SECRET` existentes. Agregar:

```env
SENTINEL_URL="http://localhost:3001"
SENTINEL_API_KEY="LA_CLAVE_GENERADA_EN_SENTINEL"
```

3. Iniciar SENTINEL en el puerto 3001: `npm.cmd run dev -- -p 3001`.
4. Iniciar ATLAS en el puerto 3000: `npm.cmd run dev -- -p 3000`.
5. Probar registro, inicio de sesión correcto y fallido en ATLAS; revisar Live Events en SENTINEL.

En producción, configurar `SENTINEL_URL` con la URL HTTPS del despliegue de SENTINEL y `SENTINEL_API_KEY` en las variables de entorno **server-side** de Vercel para ATLAS. No agregar la API key al código ni a Git.

## Qué eventos se envían

- `user_registered`: cuenta creada.
- `successful_login`: autenticación correcta.
- `failed_login`: credenciales incorrectas.
- `login_blocked`: bloqueo temporal por intentos reiterados.

Se envía la IP reportada por el proxy y un identificador seudónimo HMAC del correo, nunca contraseñas ni tokens de sesión. Si falta la configuración, no se envían eventos. El envío tiene timeout de 2,5 segundos y fallos de SENTINEL no bloquean ATLAS.

**Nota:** el detector de SENTINEL V2 requiere 5 eventos `failed_login` desde una misma IP en 60 segundos para crear un incidente. ATLAS bloquea por correo después de 5 intentos, por lo que se puede probar la detección con varios correos o usando su simulador. Las IPs derivadas de cabeceras de proxy deben considerarse no verificadas si se ejecuta fuera de una infraestructura de proxy confiable.

## Seguridad

SENTINEL y ATLAS deben mantener bases de datos y credenciales separadas. No habilitar `ENABLE_DEMO_WRITES` en despliegues públicos. Rotar las credenciales de Neon previamente expuestas y guardar la API key solo en el backend. El transporte de eventos es best-effort: no hay cola persistente ni reintentos en esta versión.
