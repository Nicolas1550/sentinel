import type { Earthquake } from './types';

// Datos EXCLUSIVAMENTE de demostración: nunca deben presentarse como eventos reales.
const fixtures = [
  ['Sur de Japón', 5.8, 32.6, 132.8, 24],
  ['Costa de Chile', 5.1, -30.1, -72.1, 31],
  ['Islas Aleutianas, Alaska', 4.7, 52.2, -171.1, 46],
  ['Indonesia', 5.4, -6.2, 128.8, 82],
  ['Islas Tonga', 4.9, -20.1, -174.3, 75],
  ['California, Estados Unidos', 3.6, 36.2, -121.1, 9],
  ['Nueva Zelanda', 4.4, -39.1, 176.5, 18],
  ['Grecia', 4.2, 37.8, 25.1, 11],
  ['Perú', 4.8, -14.8, -74.6, 51],
  ['Papúa Nueva Guinea', 5.2, -4.3, 151.3, 63],
  ['México', 4.1, 17.4, -99.3, 36],
  ['Turquía', 3.9, 38.5, 38.1, 8],
] as const;

export function getDemoEarthquakes(): Earthquake[] {
  const now = Date.now();
  return fixtures.map(([place, magnitude, latitude, longitude, depth], index) => ({
    id: `demo-${index + 1}`,
    title: `SIMULACIÓN · ${place}`,
    place,
    magnitude,
    latitude,
    longitude,
    depth,
    time: now - (index * 53 + 18) * 60 * 1000,
    url: '',
  }));
}
