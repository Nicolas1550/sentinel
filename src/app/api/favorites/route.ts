import { NextRequest, NextResponse } from 'next/server';
import { sendSecurityEvent } from '@/lib/sentinel';
import { getUserId } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { authUnavailable, fail } from '@/lib/api';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) { await sendSecurityEvent(request, 'unauthorized_access', '', 'Acceso sin sesión a favoritos'); return fail('Iniciá sesión para ver tus favoritos.', 401); }
  try {
    const sql = getDb();
    const rows = await sql`SELECT earthquake_id, title, magnitude, latitude, longitude, depth_km, occurred_at, usgs_url, created_at
      FROM favorites WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 200`;
    return NextResponse.json({ favorites: rows.map(row => ({
      earthquakeId: String(row.earthquake_id), title: String(row.title), magnitude: Number(row.magnitude),
      latitude: Number(row.latitude), longitude: Number(row.longitude), depth: Number(row.depth_km),
      time: new Date(String(row.occurred_at)).getTime(), url: String(row.usgs_url || ''),
      savedAt: new Date(String(row.created_at)).toISOString(),
    })) });
  } catch {
    return fail('No se pudieron cargar los favoritos. ¿Ejecutaste el SQL?', 500);
  }
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return authUnavailable();
  const userId = await getUserId();
  if (!userId) { await sendSecurityEvent(request, 'unauthorized_access', '', 'Intento de guardar favoritos sin sesión'); return fail('Iniciá sesión para guardar eventos.', 401); }
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id) || id.startsWith('demo-')) {
      return fail('ID de evento inválido.');
    }
    // No confiar en magnitud, ubicación ni URL enviadas por el navegador.
    // Consultamos el evento original de USGS antes de guardarlo en PostgreSQL.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let upstream: Response;
    try {
      upstream = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=${encodeURIComponent(id)}`, {
        signal: controller.signal, cache: 'no-store',
      });
    } finally {
      clearTimeout(timer);
    }
    if (!upstream.ok) return fail('USGS no pudo verificar el evento. Intentá nuevamente.', 502);
    const data: unknown = await upstream.json();
    if (!data || typeof data !== 'object') return fail('USGS devolvió un evento inválido.', 502);
    const payload = data as Record<string, unknown>;
    const feature = payload.type === 'FeatureCollection' && Array.isArray(payload.features)
      ? payload.features[0] : payload;
    if (!feature || typeof feature !== 'object') return fail('USGS no encontró el evento.', 404);
    const item = feature as Record<string, unknown>;
    const props = item.properties as Record<string, unknown> | undefined;
    const geo = item.geometry as { coordinates?: unknown } | undefined;
    const coords = geo?.coordinates;
    if (!props || !Array.isArray(coords) || coords.length < 3) {
      return fail('Datos geográficos incompletos.', 502);
    }
    const [longitude, latitude, depth] = coords.map(Number);
    const magnitude = Number(props.mag);
    const time = Number(props.time);
    const title = String(props.place || 'Ubicación no disponible').slice(0, 200);
    const url = typeof props.url === 'string' && props.url.startsWith('https://earthquake.usgs.gov/') ? props.url : '';
    if (![longitude, latitude, depth, magnitude, time].every(Number.isFinite) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
        magnitude < -2 || magnitude > 10 || depth < -10 || depth > 1000 || time < 0) {
      return fail('Datos sísmicos inválidos.', 502);
    }
    const sql = getDb();
    await sql`INSERT INTO favorites (user_id, earthquake_id, title, magnitude, latitude, longitude, depth_km, occurred_at, usgs_url)
      VALUES (${userId}, ${id}, ${title}, ${magnitude}, ${latitude}, ${longitude}, ${depth}, ${new Date(time).toISOString()}, ${url})
      ON CONFLICT (user_id, earthquake_id) DO NOTHING`;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return fail('No se pudo guardar el evento.', 500);
  }
}
