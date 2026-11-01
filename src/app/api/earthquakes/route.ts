import { NextRequest, NextResponse } from 'next/server';
import { getDemoEarthquakes } from '@/lib/demo-data';
import type { Earthquake, QuakeResponse } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get('range') === 'week' ? 'week' : 'day';
  const feed = range === 'week' ? 'all_week' : 'all_day';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);
    let response: Response;
    try {
      response = await fetch(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`, {
        next: { revalidate: 300 },
        signal: controller.signal,
        headers: { Accept: 'application/geo+json, application/json' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error(`USGS respondió ${response.status}`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('features' in data) || !Array.isArray(data.features)) {
      throw new Error('Respuesta de USGS inválida');
    }
    const events: Earthquake[] = data.features.slice(0, 4000).flatMap((feature: unknown) => {
      if (!feature || typeof feature !== 'object') return [];
      const item = feature as Record<string, unknown>;
      const props = item.properties as Record<string, unknown> | undefined;
      const geometry = item.geometry as { coordinates?: unknown } | undefined;
      const coords = geometry?.coordinates;
      if (!props || !Array.isArray(coords) || coords.length < 3) return [];
      const [lon, lat, depth] = coords.map(Number);
      const magnitude = Number(props.mag);
      const time = Number(props.time);
      if (![lon, lat, depth, magnitude, time].every(Number.isFinite)) return [];
      const place = String(props.place || 'Ubicación no disponible').slice(0, 200);
      return [{
        id: String(item.id || '').slice(0, 80),
        title: place,
        place,
        magnitude,
        latitude: lat,
        longitude: lon,
        depth,
        time,
        url: typeof props.url === 'string' && props.url.startsWith('https://earthquake.usgs.gov/') ? props.url : '',
      }];
    });
    const payload: QuakeResponse = { source: 'usgs', updatedAt: new Date().toISOString(), events };
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch {
    const payload: QuakeResponse = {
      source: 'demo',
      updatedAt: new Date().toISOString(),
      events: getDemoEarthquakes(),
      notice: 'USGS no está disponible. Se muestran eventos ficticios de demostración, NO datos reales.',
    };
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  }
}
