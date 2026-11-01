# Pruebas de telemetría ATLAS → SENTINEL

1. Con ATLAS en :3000 y SENTINEL en :3001, comprobar que `.env.local` de ATLAS tiene `SENTINEL_URL` y `SENTINEL_API_KEY` (no compartirlas).
2. Intentar un login con contraseña errónea **una vez**, sin provocar un bloqueo. Buscar `failed_login` en Live Events.
3. Iniciar sesión correctamente. Buscar `successful_login` (este es el nombre real, no `login_success`).
4. Intentar registrar un correo que ya exista. Buscar `registration_failed`.
5. Cerrar sesión. Buscar `logout`.
6. Sin sesión, abrir `http://localhost:3000/api/favorites` en el navegador. Debe responder 401 y producir `unauthorized_access`.
7. Revisar la consola del servidor ATLAS: mensajes `[ATLAS/SENTINEL] ... accepted: HTTP 2xx` confirman aceptación por la API; un rechazo o error se informa sin revelar credenciales.

**Nota:** La visualización depende también de que la versión de SENTINEL acepte y muestre esos nombres de evento. Los eventos de autenticación no deben generar incidentes de alta severidad por sí solos. No se incluyen credenciales ni `.env.local` en el ZIP.
