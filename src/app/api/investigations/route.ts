import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';

export const runtime = 'nodejs';

export async function GET() {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión para ver tus investigaciones.', 401);
  try {
    const sql = getDb();
    const rows = await sql`SELECT id, title, notes, period, region_id, min_magnitude, search_term, created_at
      FROM investigations WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 100`;
    return NextResponse.json({ investigations: rows.map(row => ({
      id: String(row.id), title: String(row.title), notes: String(row.notes || ''),
      range: row.period === 'week' ? 'week' : 'day', regionId: String(row.region_id),
      minMag: Number(row.min_magnitude), search: String(row.search_term || ''),
      createdAt: new Date(String(row.created_at)).toISOString(),
    })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('No se pudieron leer las investigaciones. Ejecutá database/04-ATLAS-V2.sql en Neon.', 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión para guardar investigaciones.', 401);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos inválidos.');
    const item = body as Record<string, unknown>;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const notes = typeof item.notes === 'string' ? item.notes.trim() : '';
    const period = item.range === 'week' ? 'week' : item.range === 'day' ? 'day' : null;
    const regionId = typeof item.regionId === 'string' ? item.regionId.trim() : '';
    const minMag = typeof item.minMag === 'number' ? item.minMag : NaN;
    const search = typeof item.search === 'string' ? item.search.trim() : '';
    if (title.length < 3 || title.length > 100 || notes.length > 2000 || !period ||
        !/^[a-z0-9-]{2,40}$/.test(regionId) || !Number.isFinite(minMag) || minMag < 0 || minMag > 9 ||
        search.length > 120) return fail('Revisá título, notas y filtros.');
    const sql = getDb();
    const rows = await sql`INSERT INTO investigations (user_id, title, notes, period, region_id, min_magnitude, search_term)
      VALUES (${userId}, ${title}, ${notes}, ${period}, ${regionId}, ${minMag}, ${search}) RETURNING id`;
    return NextResponse.json({ ok: true, id: String(rows[0].id) }, { status: 201 });
  } catch {
    return fail('No se pudo guardar la investigación. Ejecutá database/04-ATLAS-V2.sql en Neon.', 503);
  }
}
