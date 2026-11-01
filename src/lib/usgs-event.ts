import { parseUsgs } from './usgs';
import { isValidUsgsId } from './seismic';
import type { Earthquake } from './types';

/** Server-side verification: never trust client-provided coordinates or magnitude. */
export async function fetchVerifiedEvent(id: string): Promise<Earthquake | null> {
  if (!isValidUsgsId(id)) return null;
  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('eventid', id);
  // The eventid endpoint normally returns a GeoJSON Feature, not FeatureCollection.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal, cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`USGS ${response.status}`);
    const body: unknown = await response.json();
    const collection = body && typeof body === 'object' && 'type' in body && body.type === 'Feature'
      ? { features: [body] } : body;
    const event = parseUsgs(collection, 1)[0] ?? null;
    return event && event.id === id ? event : null;
  } finally { clearTimeout(timer); }
}
