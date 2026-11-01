# SENTINEL V5 — Security Monitoring SaaS

Based on the supplied V4 archive. Keeps the existing Neon database and V4 API key format.

## Install
1. Back up Neon and the existing project. Do not upload `.env.local` or secrets.
2. Run `migrations/001_v4.sql` if it has not already been applied, then run `migrations/002_v5.sql` in Neon SQL Editor (review before executing).
3. Copy your existing `.env.local` to the V5 folder locally. Do not replace existing API keys.
4. `npm install`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run dev -- -p 3001`.
5. Leave ATLAS configured to `SENTINEL_URL=http://localhost:3001`.

## Detection
- Normalizes `failed_login`, `failed.login`, and `login_failed` to `login.failed`.
- Single failed login: LOW. Blocked login: HIGH, incident. Unauthorized access: MEDIUM.
- Five failed logins from the same IP and application in 60 seconds: one HIGH incident, linked evidence. Per-organization detection rules may override threshold/window.
- Uses PostgreSQL advisory locks to avoid duplicate incidents during concurrent ingestion.
- Existing V4 events remain visible; the migration updates their severities without deleting data.
- Existing API keys and organization isolation remain intact.

## Optional alerts
Set `SENTINEL_ALERT_WEBHOOK_URL` to a trusted HTTPS webhook receiver. Optionally set `SENTINEL_ALERT_WEBHOOK_SECRET` to sign the exact JSON body using the `X-Sentinel-Signature: sha256=<hex>` header. This is best-effort notification, not a durable queue. Never expose these values in the browser.

## Verification
- Try one incorrect password in ATLAS: `login.failed`, LOW, no incident.
- A series of five failed logins within 60 seconds from the same source: HIGH incident (ATLAS may block earlier; use the dev-only simulator instead).
- ATLAS account blocked: `login.blocked`, HIGH incident.
- Test simulator requires `ENABLE_DEMO_WRITES=true` and non-production environment.

## Production limitations
Webhook delivery is best-effort; durable queues/retries, external monitoring, email/MFA, and a full penetration test are still required before commercial production. Keep demo routes disabled in production. Rotate previously exposed keys.
