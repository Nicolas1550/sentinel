import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';
import { fetchUsgs } from '@/lib/usgs';
import { matchesRule } from '@/lib/seismic';

export const runtime = 'nodejs';
/** Evaluación a pedido del usuario. No hay cron ni notificaciones push. */
export async function POST() {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión para comprobar alertas.', 401);
  try {
    const sql = getDb();
    const rules = await sql`SELECT a.id, a.min_magnitude, a.max_depth_km, a.region_id, a.created_at,
      r.min_lat, r.max_lat, r.min_lon, r.max_lon
      FROM alert_rules a LEFT JOIN regions r ON a.region_id = r.id
      WHERE a.user_id = ${userId} AND a.is_enabled = TRUE LIMIT 20`;
    if (!rules.length) return NextResponse.json({ checked: 0, newNotifications: 0, message: 'No tenés reglas activas.' });
    const events = await fetchUsgs('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', 4000);
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const matches: Array<{ rule_id: string; earthquake_id: string; title: string; magnitude: number; occurred_at: string }> = [];
    for (const rule of rules) {
      const filter = {
        minMagnitude: Number(rule.min_magnitude),
        maxDepth: rule.max_depth_km === null ? null : Number(rule.max_depth_km),
        regionId: String(rule.region_id),
        minLat: rule.min_lat === null ? null : Number(rule.min_lat),
        maxLat: rule.max_lat === null ? null : Number(rule.max_lat),
        minLon: rule.min_lon === null ? null : Number(rule.min_lon),
        maxLon: rule.max_lon === null ? null : Number(rule.max_lon),
        createdAt: new Date(String(rule.created_at)).getTime(),
      };
      for (const event of events) {
        if (!matchesRule(event, filter, cutoff)) continue;
        matches.push({ rule_id: String(rule.id), earthquake_id: event.id, title: event.place,
          magnitude: event.magnitude, occurred_at: new Date(event.time).toISOString() });
        if (matches.length >= 120) break;
      }
      if (matches.length >= 120) break;
    }
    if (!matches.length) return NextResponse.json({ checked: rules.length, newNotifications: 0, message: 'Sin coincidencias en las últimas 24 horas.' });
    const rows = await sql`INSERT INTO notifications (user_id, rule_id, earthquake_id, title, magnitude, occurred_at)
      SELECT ${userId}::uuid, x.rule_id, x.earthquake_id, x.title, x.magnitude, x.occurred_at
      FROM jsonb_to_recordset(${JSON.stringify(matches)}::jsonb)
      AS x(rule_id uuid, earthquake_id varchar(80), title varchar(220), magnitude numeric, occurred_at timestamptz)
      ON CONFLICT (user_id, rule_id, earthquake_id) DO NOTHING RETURNING id`;
    return NextResponse.json({ checked: rules.length, newNotifications: rows.length, evaluatedEvents: events.length,
      capped: matches.length >= 120, message: 'Comprobación manual realizada con el feed USGS de 24 horas.' });
  } catch { return fail('No se pudo comprobar USGS o guardar notificaciones. Verificá la migración V3.', 503); }
}
