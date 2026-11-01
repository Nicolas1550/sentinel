# Cambios de ATLAS V3 respecto de V2

- Nuevos módulos React: `AlertCenter`, `HistoricalExplorer`, `ReportsPanel`.
- Nuevos endpoints: `GET/POST /api/alerts`, `PATCH/DELETE /api/alerts/[id]`, `POST /api/alerts/check`, `GET/PATCH /api/notifications`, `GET /api/historical`, `GET/POST /api/historical/archive`, `GET/POST /api/reports`, `GET/PUT /api/preferences`.
- `Globe.tsx`: capa opcional de densidad basada en celdas de 15 grados (exploratoria, no geofísica).
- `AtlasDashboard.tsx`: navegación V3, filtros predeterminados guardados en Neon, integración de módulos.
- `database/05-ATLAS-V3.sql`: cinco tablas nuevas con índices y restricciones, sin modificar las originales.
- `src/lib/usgs.ts`: parseo reutilizable del GeoJSON oficial.
- Metadatos SEO actualizados para V3.

## Qué NO cambia

- El SQL original `00-INSTALAR-TODO.sql`, `01-schema.sql`, `02-seed-regions.sql` y `04-ATLAS-V2.sql` sigue igual.
- La conexión a la misma Neon `neondb`, los usuarios, favoritos e investigaciones.
- Las rutas de login, registro y favoritos.

## Límites intencionales

- Alertas solo con comprobación manual; no cron, email ni push.
- Informe PDF vía impresión del navegador; en Neon se guardan metadatos, no el archivo PDF.
- Historial de hasta 400 eventos por consulta y archivado manual de hasta 100 por acción.
- No se garantiza funcionamiento hasta ejecutar `npm install`, `npm run typecheck` y `npm run build` localmente.
