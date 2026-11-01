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
    const rows = await sql`SELECT id, title, source, event_count, max_magnitude, summary, created_at, is_public, share_token
      FROM generated_reports WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
    return NextResponse.json({ reports: rows.map(row => ({ id: String(row.id), title: String(row.title),
      source: String(row.source), eventCount: Number(row.event_count),
      maxMagnitude: row.max_magnitude === null ? null : Number(row.max_magnitude),
      summary: row.summary, isPublic: Boolean(row.is_public),
      shareToken: row.is_public ? String(row.share_token) : null, createdAt: new Date(String(row.created_at)).toISOString() })) },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('No se pudieron cargar los informes. Ejecutá database/05-ATLAS-V3.sql.', 503); }
}
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión para guardar informes.', 401);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos inválidos.');
    const item = body as Record<string, unknown>;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const source = item.source === 'usgs' ? 'usgs' : item.source === 'demo' ? 'demo' : null;
    const eventCount = item.eventCount;
    const maxMagnitude = item.maxMagnitude === null ? null : item.maxMagnitude;
    const summary = item.summary;
    if (title.length < 3 || title.length > 100 || !source || typeof eventCount !== 'number' || !Number.isInteger(eventCount) ||
      (eventCount as number) < 0 || (eventCount as number) > 10000 ||
      (maxMagnitude !== null && (typeof maxMagnitude !== 'number' || !Number.isFinite(maxMagnitude) || maxMagnitude < -2 || maxMagnitude > 10)) ||
      !summary || typeof summary !== 'object' || Array.isArray(summary) || JSON.stringify(summary).length > 3000) return fail('Informe inválido.');
    const sql = getDb();
    const rows = await sql`INSERT INTO generated_reports (user_id, title, source, event_count, max_magnitude, summary)
      VALUES (${userId}, ${title}, ${source}, ${eventCount as number}, ${maxMagnitude as number | null}, ${JSON.stringify(summary)}::jsonb) RETURNING id`;
    return NextResponse.json({ ok: true, id: String(rows[0].id) }, { status: 201 });
  } catch { return fail('No se pudo guardar el informe. Ejecutá database/05-ATLAS-V3.sql.', 503); }
}
