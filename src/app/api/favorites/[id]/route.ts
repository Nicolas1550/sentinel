import { NextRequest, NextResponse } from 'next/server';
import { sendSecurityEvent } from '@/lib/sentinel';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) { await sendSecurityEvent(request, 'unauthorized_access', '', 'Intento de borrar favorito sin sesión'); return fail('Iniciá sesión.', 401); }
  const { id } = await context.params;
  if (!id || id.length > 80) return fail('Identificador inválido.');
  try {
    const sql = getDb();
    await sql`DELETE FROM favorites WHERE user_id = ${userId} AND earthquake_id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return fail('No se pudo eliminar el favorito.', 500);
  }
}
