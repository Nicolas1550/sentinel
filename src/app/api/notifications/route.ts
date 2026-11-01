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
    const rows = await sql`SELECT n.id, n.earthquake_id, n.title, n.magnitude, n.occurred_at,
      n.is_read, n.created_at, COALESCE(a.name, 'Alerta eliminada') AS rule_name
      FROM notifications n LEFT JOIN alert_rules a ON a.id = n.rule_id
      WHERE n.user_id = ${userId} ORDER BY n.created_at DESC LIMIT 100`;
    return NextResponse.json({ notifications: rows.map(row => ({ id: String(row.id),
      earthquakeId: String(row.earthquake_id), title: String(row.title), magnitude: Number(row.magnitude),
      occurredAt: new Date(String(row.occurred_at)).toISOString(),
      createdAt: new Date(String(row.created_at)).toISOString(), read: Boolean(row.is_read),
      ruleName: String(row.rule_name) })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('No se pudieron cargar las notificaciones. Ejecutá database/05-ATLAS-V3.sql.', 503); }
}
export async function PATCH(request: NextRequest) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || (body as { action?: unknown }).action !== 'read-all') return fail('Acción inválida.');
    const sql = getDb();
    await sql`UPDATE notifications SET is_read = TRUE WHERE user_id = ${userId} AND is_read = FALSE`;
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudieron actualizar las notificaciones.', 503); }
}
