import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';
import { fetchVerifiedEvent } from '@/lib/usgs-event';
import { isValidUsgsId } from '@/lib/seismic';

export const runtime = 'nodejs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id } = await context.params;
  if (!uuid.test(id)) return fail('ID inválido.');
  try {
    const sql = getDb();
    const rows = await sql`SELECT e.id, e.earthquake_id, e.title, e.magnitude, e.depth_km,
      e.occurred_at, e.usgs_url, e.note, e.added_at
      FROM investigation_events e JOIN investigations i ON i.id = e.investigation_id
      WHERE i.id = ${id} AND i.user_id = ${userId} AND e.user_id = ${userId}
      ORDER BY e.added_at DESC LIMIT 100`;
    return NextResponse.json({ events: rows.map(row => ({
      id: String(row.id), earthquakeId: String(row.earthquake_id), title: String(row.title),
      magnitude: Number(row.magnitude), depth: Number(row.depth_km),
      occurredAt: new Date(String(row.occurred_at)).toISOString(),
      url: String(row.usgs_url || ''), note: String(row.note),
      addedAt: new Date(String(row.added_at)).toISOString(),
    })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('No se pudieron leer los eventos de investigación. Ejecutá SQL V4.', 503); }
}

export async function POST(request: NextRequest, context: Context) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) return fail('Iniciá sesión.', 401);
  const { id } = await context.params;
  if (!uuid.test(id)) return fail('ID inválido.');
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos inválidos.');
    const eventId = (body as Record<string, unknown>).earthquakeId;
    if (!isValidUsgsId(eventId)) return fail('ID de terremoto inválido.');
    const sql = getDb();
    const owner = await sql`SELECT id FROM investigations WHERE id = ${id} AND user_id = ${userId}`;
    if (!owner.length) return fail('Investigación no encontrada.', 404);
    const count = await sql`SELECT COUNT(*)::int AS total FROM investigation_events WHERE investigation_id = ${id}`;
    if (Number(count[0].total) >= 100) return fail('Máximo 100 eventos por investigación.', 409);
    const event = await fetchVerifiedEvent(eventId);
    if (!event) return fail('USGS no encontró el evento. No se guardaron datos inventados.', 404);
    const rows = await sql`INSERT INTO investigation_events
      (investigation_id, user_id, earthquake_id, title, magnitude, latitude, longitude, depth_km, occurred_at, usgs_url)
      VALUES (${id}, ${userId}, ${event.id}, ${event.place}, ${event.magnitude},
        ${event.latitude}, ${event.longitude}, ${event.depth}, ${new Date(event.time).toISOString()}, ${event.url})
      ON CONFLICT (investigation_id, earthquake_id) DO NOTHING RETURNING id`;
    return NextResponse.json({ ok: true, added: rows.length === 1 }, { status: rows.length ? 201 : 200 });
  } catch { return fail('No se pudo asociar el terremoto. Verificá USGS y SQL V4.', 503); }
}
