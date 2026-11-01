import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';

export const runtime = 'nodejs';
export async function GET() {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión para consultar tus alertas.', 401);
  try {
    const sql = getDb();
    const rows = await sql`SELECT id, name, region_id, min_magnitude, max_depth_km, is_enabled, created_at
      FROM alert_rules WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
    return NextResponse.json({ rules: rows.map(row => ({ id: String(row.id), name: String(row.name),
      regionId: String(row.region_id), minMagnitude: Number(row.min_magnitude),
      maxDepth: row.max_depth_km === null ? null : Number(row.max_depth_km),
      enabled: Boolean(row.is_enabled), createdAt: new Date(String(row.created_at)).toISOString() })) },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('No se pudieron leer las reglas. Ejecutá database/05-ATLAS-V3.sql.', 503); }
}
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión para crear alertas.', 401);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos inválidos.');
    const item = body as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const regionId = typeof item.regionId === 'string' ? item.regionId : '';
    const minMagnitude = Number(item.minMagnitude);
    const maxDepth = item.maxDepth === null || item.maxDepth === '' || item.maxDepth === undefined ? null : Number(item.maxDepth);
    if (name.length < 3 || name.length > 80 || !/^[a-z0-9-]{2,40}$/.test(regionId) ||
      !Number.isFinite(minMagnitude) || minMagnitude < 0 || minMagnitude > 9 ||
      (maxDepth !== null && (!Number.isFinite(maxDepth) || maxDepth < 0 || maxDepth > 800))) return fail('Revisá nombre, región, magnitud y profundidad.');
    const sql = getDb();
    const regions = await sql`SELECT id FROM regions WHERE id = ${regionId} LIMIT 1`;
    if (regionId !== 'global' && regions.length === 0) return fail('La región no existe.');
    const count = await sql`SELECT COUNT(*)::int AS total FROM alert_rules WHERE user_id = ${userId}`;
    if (Number(count[0].total) >= 20) return fail('Máximo 20 reglas por cuenta.', 409);
    const rows = await sql`INSERT INTO alert_rules (user_id, name, region_id, min_magnitude, max_depth_km)
      VALUES (${userId}, ${name}, ${regionId}, ${minMagnitude}, ${maxDepth}) RETURNING id`;
    return NextResponse.json({ ok: true, id: String(rows[0].id) }, { status: 201 });
  } catch { return fail('No se pudo guardar la alerta. Ejecutá database/05-ATLAS-V3.sql.', 503); }
}
