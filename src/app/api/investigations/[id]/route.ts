import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return fail('ID inválido.');
  try {
    const sql = getDb();
    await sql`DELETE FROM investigations WHERE id = ${id} AND user_id = ${userId}`;
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudo eliminar la investigación.', 500); }
}


/** Edit title and notes without overwriting saved filters or event attachments. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return fail('ID inválido.');
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos inválidos.');
    const data = body as Record<string, unknown>;
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    const notes = typeof data.notes === 'string' ? data.notes.trim() : '';
    if (title.length < 3 || title.length > 100 || notes.length > 2000) return fail('Título o notas inválidos.');
    const sql = getDb();
    const rows = await sql`UPDATE investigations SET title = ${title}, notes = ${notes}
      WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
    if (!rows.length) return fail('Investigación no encontrada.', 404);
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudo actualizar la investigación.', 503); }
}
