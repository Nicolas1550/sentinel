import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';
import { fetchUsgs } from '@/lib/usgs';

export const runtime = 'nodejs';
/** Caché compartida de eventos públicos USGS; no almacena datos personales. */
export async function GET() {
  if (!isDatabaseConfigured()) return authUnavailable();
  if (!await getUserId()) return fail('Iniciá sesión.', 401);
  try {
    const sql = getDb();
    const rows = await sql`SELECT COUNT(*)::int AS total FROM earthquake_history`;
    return NextResponse.json({ total: Number(rows[0].total) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('No se pudo leer el archivo histórico. Ejecutá database/05-ATLAS-V3.sql.', 503); }
}
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return authUnavailable();
  if (!await getUserId()) return fail('Iniciá sesión para archivar eventos.', 401);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return fail('Parámetros inválidos.');
    const { start, end, mag } = body as { start?: unknown; end?: unknown; mag?: unknown };
    if (typeof start !== 'string' || typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end) || typeof mag !== 'number' || !Number.isFinite(mag) || mag < 3.5 || mag > 8) return fail('Fechas o magnitud inválidas.');
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) ||
      startDate.toISOString().slice(0, 10) !== start || endDate.toISOString().slice(0, 10) !== end ||
      endDate.getTime() < startDate.getTime() || (endDate.getTime() - startDate.getTime()) / 86400000 >= 31 ||
      endDate.getTime() > Date.now() || startDate.getTime() < Date.now() - 15 * 366 * 86400000) return fail('Período inválido.');
    const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('starttime', start);
    url.searchParams.set('endtime', new Date(endDate.getTime() + 86400000).toISOString().slice(0, 10));
    url.searchParams.set('minmagnitude', String(mag));
    url.searchParams.set('orderby', 'time');
    url.searchParams.set('limit', '100');
    const events = await fetchUsgs(url.toString(), 100);
    if (!events.length) return NextResponse.json({ archived: 0, message: 'No se encontraron eventos.' });
    const payload = events.map(event => ({ earthquake_id: event.id, title: event.place,
      magnitude: event.magnitude, latitude: event.latitude, longitude: event.longitude,
      depth_km: event.depth, occurred_at: new Date(event.time).toISOString(), usgs_url: event.url }));
    const sql = getDb();
    const rows = await sql`INSERT INTO earthquake_history (earthquake_id, title, magnitude, latitude, longitude, depth_km, occurred_at, usgs_url)
      SELECT x.earthquake_id, x.title, x.magnitude, x.latitude, x.longitude, x.depth_km, x.occurred_at, x.usgs_url
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
      AS x(earthquake_id varchar(80), title varchar(220), magnitude numeric, latitude double precision,
        longitude double precision, depth_km numeric, occurred_at timestamptz, usgs_url text)
      ON CONFLICT (earthquake_id) DO NOTHING RETURNING earthquake_id`;
    return NextResponse.json({ archived: rows.length, inspected: events.length,
      message: 'Eventos públicos USGS archivados en Neon sin duplicados.' });
  } catch { return fail('No se pudo archivar el historial. Revisá la conexión con USGS y la migración V3.', 503); }
}
