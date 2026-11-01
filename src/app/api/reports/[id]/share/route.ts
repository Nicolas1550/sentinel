import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';
export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return fail('ID inválido.');
  try {
    const body: unknown = await request.json();
    const enabled = body && typeof body === 'object' ? (body as Record<string, unknown>).enabled : null;
    if (typeof enabled !== 'boolean') return fail('Elegí publicar o despublicar.');
    const sql = getDb();
    const rows = await sql`UPDATE generated_reports
      SET is_public = ${enabled}, share_token = CASE
        WHEN ${enabled} THEN COALESCE(share_token, gen_random_uuid()) ELSE share_token END
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING share_token, is_public`;
    if (!rows.length) return fail('Informe no encontrado.', 404);
    return NextResponse.json({ ok: true, isPublic: Boolean(rows[0].is_public),
      token: rows[0].is_public ? String(rows[0].share_token) : null });
  } catch { return fail('No se pudo actualizar el enlace. Ejecutá SQL V4.', 503); }
}
