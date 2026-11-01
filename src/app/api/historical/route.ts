import { NextRequest, NextResponse } from 'next/server';
import { fetchUsgs } from '@/lib/usgs';
import { fail } from '@/lib/api';

export const runtime = 'nodejs';

function parseDay(input: string | null): Date | null {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === input ? date : null;
}

export async function GET(request: NextRequest) {
  const start = parseDay(request.nextUrl.searchParams.get('start'));
  const end = parseDay(request.nextUrl.searchParams.get('end'));
  const magnitude = Number(request.nextUrl.searchParams.get('mag') ?? '4');
  if (!start || !end || !Number.isFinite(magnitude) || magnitude < 3.5 || magnitude > 8) {
    return fail('Elegí fechas válidas y una magnitud mínima entre 3.5 y 8.0.');
  }
  const endExclusive = new Date(end.getTime() + 86400000);
  const days = (endExclusive.getTime() - start.getTime()) / 86400000;
  if (days < 1 || days > 31 || end.getTime() > Date.now() || start.getTime() < Date.now() - 15 * 366 * 86400000) {
    return fail('Consultá un intervalo de 1 a 30 días, dentro de los últimos 15 años y sin fechas futuras.');
  }
  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('starttime', start.toISOString().slice(0, 10));
  url.searchParams.set('endtime', endExclusive.toISOString().slice(0, 10));
  url.searchParams.set('minmagnitude', String(magnitude));
  url.searchParams.set('orderby', 'time');
  url.searchParams.set('limit', '400');
  try {
    const events = await fetchUsgs(url.toString(), 400);
    return NextResponse.json({ source: 'usgs', events, truncated: events.length === 400,
      period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
      updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  } catch {
    return fail('USGS histórico no respondió. Reintentá más tarde o acortá el período. No se muestran datos simulados.', 503);
  }
}
