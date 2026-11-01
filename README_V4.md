# SENTINEL V4 — Multi-tenant Security Monitoring SaaS (MVP)

**Novedades**: SDK JavaScript server-side, documentación de onboarding, exportación CSV por organización, auditoría de creación/revocación de API keys, health check, límites de peticiones compartidos vía PostgreSQL, validación de tamaño de payload y aplicaciones activas. Conserva V3: login, registro, organizaciones, API keys, incidentes, filtros y gráficos.

## Instalar (Windows PowerShell)
1. Descomprimir en `sentinel-v4`.
2. Copiar `.env.local` desde la versión anterior que funciona: `Copy-Item ..\sentinel-v3\.env.local .\.env.local` (ajustar origen si tu versión activa está en otra carpeta). **No copies claves a GitHub**.
3. En Neon SQL Editor ejecutar `migrations/001_v4.sql` (una vez). Se agrega una tabla auxiliar `rate_limit_buckets`; las 11 originales se mantienen.
4. `npm.cmd install`, `npm.cmd run typecheck`, `npm.cmd run dev -- -p 3001`.
5. ATLAS puede seguir usando `SENTINEL_URL=http://localhost:3001` y su API key, pero revocá la clave que quedó expuesta y emití una nueva.

## Endpoints
- `POST /api/events` Bearer API key
- `GET /api/dashboard` sesión
- `GET /api/export/events?days=30` sesión
- `GET /api/audit` sesión
- `GET /api/health` estado de la base

## Limitaciones antes de producción comercial
No es un SIEM integral: no incluye agente host, detección DDoS de red, colas persistentes, alertas por email, facturación, SSO/MFA, retención por plan, panel de administración ni tests end-to-end. Los límites por IP dependen de cabeceras proxy confiables; definir proxy de confianza antes de exposición pública. Falta también protección contra abuso por registro masivo, verificación de email y observabilidad. La regla de detección se centra en intentos fallidos y bloqueos. No afirmar protección total ni certificación de seguridad.
