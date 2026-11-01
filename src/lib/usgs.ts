import type { Earthquake } from './types';

/** Parseo estricto del GeoJSON de USGS. No acepta URLs arbitrarias como enlaces. */
export function parseUsgs(data: unknown, limit = 500): Earthquake[] {
  if (!data || typeof data !== 'object' || !('features' in data) || !Array.isArray(data.features)) {
    throw new Error('Formato GeoJSON inválido.');
  }
  return data.features.slice(0, limit).flatMap((feature: unknown): Earthquake[] => {
    if (!feature || typeof feature !== 'object') return [];
    const row = feature as Record<string, unknown>;
    const props = row.properties as Record<string, unknown> | undefined;
    const coords = (row.geometry as { coordinates?: unknown } | undefined)?.coordinates;
    if (!props || !Array.isArray(coords) || coords.length < 3) return [];
    const [longitude, latitude, depth] = coords.map(Number);
    const magnitude = Number(props.mag);
    const time = Number(props.time);
    const id = typeof row.id === 'string' ? row.id : '';
    if (!id || id.length > 80 || ![longitude, latitude, depth, magnitude, time].every(Number.isFinite) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || magnitude < -2 || magnitude > 10 ||
        time < 0) return [];
    const place = String(props.place || 'Ubicación desconocida').slice(0, 200);
    return [{ id, title: place, place, magnitude, latitude, longitude, depth, time,
      url: typeof props.url === 'string' && props.url.startsWith('https://earthquake.usgs.gov/') ? props.url : '' }];
  });
}

export async function fetchUsgs(url: string, limit = 500): Promise<Earthquake[]> {
  if (!url.startsWith('https://earthquake.usgs.gov/')) throw new Error('Origen no permitido.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, next: { revalidate: 600 },
      headers: { Accept: 'application/geo+json, application/json' } });
    if (!response.ok) throw new Error(`USGS respondió ${response.status}`);
    return parseUsgs(await response.json(), limit);
  } finally { clearTimeout(timeout); }
}
