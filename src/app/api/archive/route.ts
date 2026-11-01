import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { fail } from '@/lib/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public read-only archive; no personal data. */
export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) return fail('Archivo Neon no configurado.', 503);
  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');
  const mag = Number(request.nextUrl.searchParams.get('mag') ?? '4');
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    !Number.isFinite(mag) || mag < 0 || mag > 9) return fail('Fechas o magnitud inválidas.');
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) ||
    from.toISOString().slice(0, 10) !== start || to.toISOString().slice(0, 10) !== end ||
    to.getTime() < from.getTime() || to.getTime() - from.getTime() > 366 * 86400000) {
    return fail('El archivo permite períodos de hasta 366 días.');
  }
  try {
    const sql = getDb();
    const rows = await sql`SELECT earthquake_id, title, magnitude, latitude, longitude, depth_km,
      occurred_at, usgs_url FROM earthquake_history
      WHERE occurred_at >= ${from.toISOString()} AND occurred_at < ${new Date(to.getTime() + 86400000).toISOString()}
        AND magnitude >= ${mag}
      ORDER BY occurred_at DESC LIMIT 401`;
    return NextResponse.json({ source: 'neon-usgs-archive', truncated: rows.length > 400,
      events: rows.slice(0, 400).map(row => ({
        id: String(row.earthquake_id), title: String(row.title), place: String(row.title),
        magnitude: Number(row.magnitude), latitude: Number(row.latitude), longitude: Number(row.longitude),
        depth: Number(row.depth_km), time: new Date(String(row.occurred_at)).getTime(),
        url: String(row.usgs_url || ''),
      })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('No se pudo consultar el archivo. Ejecutá la migración V3.', 503); }
}
