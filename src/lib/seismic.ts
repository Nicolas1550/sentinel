import type { Earthquake } from './types';

export type SeismicRule = {
  minMagnitude: number;
  maxDepth: number | null;
  regionId: string;
  minLat?: number | null;
  maxLat?: number | null;
  minLon?: number | null;
  maxLon?: number | null;
  createdAt?: number;
};

/** Deterministic matching; only events after the rule was created qualify. */
export function matchesRule(event: Earthquake, rule: SeismicRule, cutoff: number): boolean {
  if (!Number.isFinite(event.time) || event.time < cutoff ||
      (rule.createdAt !== undefined && event.time < rule.createdAt) ||
      event.magnitude < rule.minMagnitude ||
      (rule.maxDepth !== null && event.depth > rule.maxDepth)) return false;
  if (rule.regionId === 'global') return true;
  if ([rule.minLat, rule.maxLat, rule.minLon, rule.maxLon].some(value => value === null || value === undefined)) return false;
  return event.latitude >= Number(rule.minLat) && event.latitude <= Number(rule.maxLat) &&
    event.longitude >= Number(rule.minLon) && event.longitude <= Number(rule.maxLon);
}

export function isValidUsgsId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{3,80}$/.test(id) && !id.startsWith('demo-');
}

export function toUsgsRecord(event: Earthquake) {
  return {
    earthquake_id: event.id,
    title: event.place.slice(0, 220),
    magnitude: event.magnitude,
    latitude: event.latitude,
    longitude: event.longitude,
    depth_km: event.depth,
    occurred_at: new Date(event.time).toISOString(),
    usgs_url: event.url,
  };
}
