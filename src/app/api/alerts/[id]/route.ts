import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export async function DELETE(_request: NextRequest, context: Context) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id } = await context.params;
  if (!validId(id)) return fail('ID inválido.');
  try {
    const sql = getDb();
    await sql`DELETE FROM alert_rules WHERE id = ${id} AND user_id = ${userId}`;
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudo eliminar la alerta.', 503); }
}
export async function PATCH(request: NextRequest, context: Context) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id } = await context.params;
  if (!validId(id)) return fail('ID inválido.');
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || typeof (body as { enabled?: unknown }).enabled !== 'boolean') return fail('Estado inválido.');
    const enabled = (body as { enabled: boolean }).enabled;
    const sql = getDb();
    const rows = await sql`UPDATE alert_rules SET is_enabled = ${enabled} WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
    if (!rows.length) return fail('Regla no encontrada.', 404);
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudo modificar la alerta.', 503); }
}
