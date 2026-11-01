# SENTINEL V3 — Analytics & Investigation

## Cambios
- Gráfico de eventos de 7 días y distribución por severidad (consultas reales a Neon).
- Filtros por texto y severidad, vista de detalle y metadatos de eventos.
- Investigación de incidentes con evidencias vinculadas y control de acceso por organización.
- Normalización de `login_blocked` / `login.blocked` y `login_failed` / `login.failed`; bloqueo genera incidente high y fallos tienen severidad medium.
- Corrige el error de comillas SQL al registrar aplicaciones en V2.

## Instalación
1. Descomprimir en carpeta nueva `sentinel-v3`.
2. Copiar `.env.local` desde el directorio donde funciona SENTINEL V2 (no se incluye ningún secreto).
3. Ejecutar `npm.cmd install` y `npm.cmd run dev -- -p 3001`.
4. En ATLAS, mantener `SENTINEL_URL=http://localhost:3001` y una API key válida.

No se necesitan migraciones; utiliza las 11 tablas actuales. Los eventos históricos conservan su severidad anterior; la nueva clasificación se aplica a eventos nuevos.

## Seguridad y límites
Rotar las API keys y contraseñas previamente expuestas. No subir `.env.local` al repositorio. Antes de producción implementar límites de solicitudes distribuidos, retención de eventos, monitoreo y auditoría de seguridad; no activar demo writes en producción. Las alertas por email y análisis IA NO están implementados en esta versión.
