import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';
export const runtime = 'nodejs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string; eventId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id, eventId } = await context.params;
  if (!uuid.test(id) || !uuid.test(eventId)) return fail('ID inválido.');
  try {
    const body: unknown = await request.json();
    const note = body && typeof body === 'object' ? (body as Record<string, unknown>).note : null;
    if (typeof note !== 'string' || note.length > 1000) return fail('Nota inválida (máximo 1000 caracteres).');
    const sql = getDb();
    const rows = await sql`UPDATE investigation_events SET note = ${note.trim()}
      WHERE id = ${eventId} AND investigation_id = ${id} AND user_id = ${userId} RETURNING id`;
    if (!rows.length) return fail('Evento no encontrado.', 404);
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudo actualizar la nota.', 503); }
}
export async function DELETE(_request: NextRequest, context: Context) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id, eventId } = await context.params;
  if (!uuid.test(id) || !uuid.test(eventId)) return fail('ID inválido.');
  try {
    const sql = getDb();
    const rows = await sql`DELETE FROM investigation_events WHERE id = ${eventId}
      AND investigation_id = ${id} AND user_id = ${userId} RETURNING id`;
    if (!rows.length) return fail('Evento no encontrado.', 404);
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudo quitar el evento.', 503); }
}
