import { NextRequest, NextResponse } from 'next/server';
import { authorizedCron } from '@/lib/cron';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { fetchUsgs } from '@/lib/usgs';
import { matchesRule, toUsgsRecord } from '@/lib/seismic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron: once daily at 10:00 UTC (configurable in vercel.json).
 * Requires CRON_SECRET in the deployment environment.
 * Never runs on a client timer; re-running is idempotent.
 */
export async function GET(request: NextRequest) {
  if (!authorizedCron(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Base de datos no configurada.' }, { status: 503 });
  const sql = getDb();
  let runId: string | null = null;
  try {
    const created = await sql`INSERT INTO sync_runs (status) VALUES ('running') RETURNING id`;
    runId = String(created[0].id);
    const events = await fetchUsgs('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', 4000);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const valid = events.filter(e => e.time >= cutoff);

    // Archive only M4+ automatically, capped to control free-tier storage.
    const toArchive = valid.filter(e => e.magnitude >= 4).slice(0, 500).map(toUsgsRecord);
    let archived = 0;
    if (toArchive.length) {
      const rows = await sql`INSERT INTO earthquake_history
        (earthquake_id, title, magnitude, latitude, longitude, depth_km, occurred_at, usgs_url)
        SELECT x.earthquake_id, x.title, x.magnitude, x.latitude, x.longitude, x.depth_km, x.occurred_at, x.usgs_url
        FROM jsonb_to_recordset(${JSON.stringify(toArchive)}::jsonb)
        AS x(earthquake_id varchar(80), title varchar(220), magnitude numeric,
          latitude double precision, longitude double precision, depth_km numeric,
          occurred_at timestamptz, usgs_url text)
        ON CONFLICT (earthquake_id) DO NOTHING RETURNING earthquake_id`;
      archived = rows.length;
    }

    // All enabled rules, across users. Query capped to bound runtime on hobby deployments.
    const rules = await sql`SELECT a.id, a.user_id, a.min_magnitude, a.max_depth_km, a.region_id, a.created_at,
      r.min_lat, r.max_lat, r.min_lon, r.max_lon
      FROM alert_rules a LEFT JOIN regions r ON r.id = a.region_id
      WHERE a.is_enabled = TRUE ORDER BY a.created_at DESC LIMIT 501`;
    const selectedRules = rules.slice(0, 500);
    const matches: Array<{ user_id: string; rule_id: string; earthquake_id: string; title: string; magnitude: number; occurred_at: string }> = [];
    for (const row of selectedRules) {
      const rule = {
        minMagnitude: Number(row.min_magnitude),
        maxDepth: row.max_depth_km === null ? null : Number(row.max_depth_km),
        regionId: String(row.region_id),
        minLat: row.min_lat === null ? null : Number(row.min_lat),
        maxLat: row.max_lat === null ? null : Number(row.max_lat),
        minLon: row.min_lon === null ? null : Number(row.min_lon),
        maxLon: row.max_lon === null ? null : Number(row.max_lon),
        createdAt: new Date(String(row.created_at)).getTime(),
      };
      for (const event of valid) {
        if (!matchesRule(event, rule, cutoff)) continue;
        matches.push({ user_id: String(row.user_id), rule_id: String(row.id),
          earthquake_id: event.id, title: event.place.slice(0, 220),
          magnitude: event.magnitude, occurred_at: new Date(event.time).toISOString() });
        if (matches.length >= 1500) break;
      }
      if (matches.length >= 1500) break;
    }
    let notified = 0;
    // Small batches avoid oversized SQL payloads.
    for (let i = 0; i < matches.length; i += 200) {
      const batch = matches.slice(i, i + 200);
      const rows = await sql`INSERT INTO notifications
        (user_id, rule_id, earthquake_id, title, magnitude, occurred_at)
        SELECT x.user_id, x.rule_id, x.earthquake_id, x.title, x.magnitude, x.occurred_at
        FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
        AS x(user_id uuid, rule_id uuid, earthquake_id varchar(80), title varchar(220),
          magnitude numeric, occurred_at timestamptz)
        ON CONFLICT (user_id, rule_id, earthquake_id) DO NOTHING RETURNING id`;
      notified += rows.length;
    }
    const truncated = toArchive.length >= 500 || rules.length > 500 || matches.length >= 1500;
    await sql`UPDATE sync_runs SET status = 'success', scanned = ${valid.length}, archived = ${archived},
      notifications_created = ${notified}, rules_checked = ${selectedRules.length},
      truncated = ${truncated}, completed_at = NOW() WHERE id = ${runId}`;
    return NextResponse.json({ ok: true, scanned: valid.length, archived, notified,
      rulesChecked: selectedRules.length, truncated }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if (runId) {
      try { await sql`UPDATE sync_runs SET status = 'failed', completed_at = NOW() WHERE id = ${runId}`; }
      catch { /* database may be unavailable */ }
    }
    return NextResponse.json({ error: 'No se pudo completar la sincronización.' }, { status: 503 });
  }
}
