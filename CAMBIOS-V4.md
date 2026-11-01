# ATLAS V4 · Cambios y pruebas

## Novedades

- **Cron diario protegido**: `GET /api/cron/sync`, autorizado por `CRON_SECRET`, programado en `vercel.json` a las 10:00 UTC. Lee eventos reales USGS, archiva M4+ y genera notificaciones para reglas existentes sin duplicados. No hay alertas push ni predicción.
- **Telemetría**: `GET /api/sync/status` expone solo estadísticas de la última ejecución (sin datos privados), visibles en Alert Center.
- **Archivo histórico Neon**: `GET /api/archive` permite consultar los eventos archivados, con límites de fecha y de resultados. Historical Explorer distingue claramente USGS en directo de Neon.
- **Investigaciones avanzadas**: `investigation_events` vincula hasta 100 terremotos USGS por investigación. El servidor verifica cada ID con USGS; se pueden guardar notas individuales, quitar eventos y editar título/conclusiones. Todo filtrado por usuario.
- **Informes compartibles**: un informe guardado puede publicarse mediante token aleatorio, consultarse en `/report/<token>` en modo solo lectura y volver a privatizarse. PDF: Ctrl+P → Guardar como PDF (no se guarda un archivo PDF en Neon).
- **Protección de login**: 5 intentos fallidos en 15 minutos por hash HMAC de correo. No se almacenan correos en la tabla de intentos.
- **Pruebas**: `npm run test` (Node 22+) verifica matching de alertas, cron, SQL incremental y aislamiento por usuario mediante contratos de código.

## Migración sin pérdida de datos

1. Hacé backup de Neon (recomendado).
2. Asegurate de haber aplicado `04-ATLAS-V2.sql` y `05-ATLAS-V3.sql` en esa misma base.
3. Ejecutá **solo** `database/06-ATLAS-V4.sql` en Neon SQL Editor.
4. Verificá las tablas nuevas con `database/07-VERIFICAR-V4.sql`.

La migración crea 3 tablas y añade 2 columnas opcionales a `generated_reports`. No borra datos. No es necesario reinstalar la base ni ejecutar `00-INSTALAR-TODO.sql`.

## Cron en Vercel

- Configurá `DATABASE_URL`, `JWT_SECRET` y `CRON_SECRET` en **Environment Variables**.
- `CRON_SECRET` debe ser aleatorio, de al menos 32 caracteres, y diferente del JWT.
- `vercel.json` agenda el cron **una vez al día, 10:00 UTC**. La ejecución real depende de los límites y soporte del plan Vercel; comprobá `/api/sync/status` y los logs.
- Para ejecutar manualmente **en local** desde PowerShell (si configuraste CRON_SECRET en `.env.local`):
  ```powershell
  $headers = @{ Authorization = "Bearer TU_CRON_SECRET" }
  Invoke-RestMethod -Uri 'http://localhost:3000/api/cron/sync' -Headers $headers
  ```
  No compartas ese secreto ni lo incluyas en el frontend.

## Comprobaciones

```powershell
npm.cmd ci
npm.cmd run verify
npm.cmd run syntax
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

`verify`, `syntax` y `test` son pruebas estáticas y de lógica; no sustituyen `typecheck` ni `build`. Se requiere la conexión a Neon y USGS para probar los flujos end-to-end reales.

## Límites intencionales

- Cron diario, no instantáneo. Hasta 500 reglas globales, 1500 coincidencias y 500 eventos M4+ por ejecución; se registra si hubo truncamiento.
- El archivo Neon no contiene todos los terremotos históricos del mundo, solo los que se archivaron.
- Las regiones son cajas geográficas aproximadas.
- Los informes públicos son resúmenes estadísticos, no PDFs almacenados.
- Las notificaciones son internas, sin correo, SMS o push.
- No es una plataforma de alerta temprana ni de predicción de terremotos.
