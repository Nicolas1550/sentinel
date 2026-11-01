import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';

export const runtime = 'nodejs';
export async function GET() {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  try {
    const sql = getDb();
    const rows = await sql`SELECT default_region_id, min_magnitude, default_period FROM user_preferences WHERE user_id = ${userId}`;
    const row = rows[0];
    return NextResponse.json({ preferences: row ? { regionId: String(row.default_region_id),
      minMag: Number(row.min_magnitude), range: row.default_period === 'week' ? 'week' : 'day' } : null },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('No se pudieron cargar tus preferencias. Ejecutá database/05-ATLAS-V3.sql.', 503); }
}
export async function PUT(request: NextRequest) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos inválidos.');
    const item = body as Record<string, unknown>;
    const regionId = typeof item.regionId === 'string' ? item.regionId : '';
    const minMag = item.minMag;
    const range = item.range;
    if (!/^[a-z0-9-]{2,40}$/.test(regionId) || typeof minMag !== 'number' ||
      !Number.isFinite(minMag) || minMag < 0 || minMag > 9 || (range !== 'day' && range !== 'week')) return fail('Preferencias inválidas.');
    const sql = getDb();
    const regions = await sql`SELECT id FROM regions WHERE id = ${regionId} LIMIT 1`;
    if (regionId !== 'global' && !regions.length) return fail('La región no existe.');
    await sql`INSERT INTO user_preferences (user_id, default_region_id, min_magnitude, default_period)
      VALUES (${userId}, ${regionId}, ${minMag}, ${range})
      ON CONFLICT (user_id) DO UPDATE SET default_region_id = EXCLUDED.default_region_id,
      min_magnitude = EXCLUDED.min_magnitude, default_period = EXCLUDED.default_period, updated_at = NOW()`;
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudieron guardar las preferencias.', 503); }
}
