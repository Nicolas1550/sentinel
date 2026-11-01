import type { Region } from './types';

export const defaultRegions: Region[] = [
  { id: 'global', name: 'Todo el planeta', minLat: -89.9, maxLat: 89.9, minLon: -179.9, maxLon: 179.9 },
  { id: 'south-america', name: 'Sudamérica', minLat: -56, maxLat: 13, minLon: -82, maxLon: -34 },
  { id: 'north-america', name: 'Norteamérica', minLat: 5, maxLat: 72, minLon: -168, maxLon: -52 },
  { id: 'europe', name: 'Europa', minLat: 34, maxLat: 72, minLon: -12, maxLon: 45 },
  { id: 'asia-pacific', name: 'Asia / Pacífico', minLat: -48, maxLat: 60, minLon: 95, maxLon: 179.9 },
  { id: 'japan', name: 'Japón', minLat: 24, maxLat: 46, minLon: 123, maxLon: 147 },
];
