import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesRule, isValidUsgsId, toUsgsRecord } from '../src/lib/seismic.ts';
import { authorizedCron } from '../src/lib/cron.ts';
const event = { id: 'us7000abcd', title: 'Japan', place: 'Japan', magnitude: 5.3,
  latitude: 35.1, longitude: 140.2, depth: 25, time: 1_800_000_000_000,
  url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd' };
const base = { minMagnitude: 5, maxDepth: 50, regionId: 'japan', minLat: 24, maxLat: 46, minLon: 123, maxLon: 147 };
test('matching por magnitud, profundidad y región', () => {
  assert.equal(matchesRule(event, base, event.time - 1000), true);
  assert.equal(matchesRule(event, { ...base, minMagnitude: 6 }, event.time - 1000), false);
  assert.equal(matchesRule(event, { ...base, maxDepth: 20 }, event.time - 1000), false);
  assert.equal(matchesRule(event, { ...base, minLon: 145 }, event.time - 1000), false);
  assert.equal(matchesRule(event, { ...base, regionId: 'global' }, event.time - 1000), true);
});
test('no genera alertas retroactivas ni fuera del intervalo', () => {
  assert.equal(matchesRule(event, { ...base, createdAt: event.time + 1 }, event.time - 1000), false);
  assert.equal(matchesRule(event, base, event.time + 1), false);
  assert.equal(matchesRule(event, { ...base, minLat: null }, event.time - 1000), false);
});
test('IDs USGS verificados y snapshot con fecha UTC', () => {
  assert.equal(isValidUsgsId('us7000abcd'), true);
  assert.equal(isValidUsgsId('demo-12345'), false);
  assert.equal(isValidUsgsId('../../secrets'), false);
  assert.equal(toUsgsRecord(event).occurred_at, new Date(event.time).toISOString());
});
test('cron exige secreto >= 32 caracteres y header Bearer exacto', () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'a'.repeat(40);
  assert.equal(authorizedCron(null), false);
  assert.equal(authorizedCron('Bearer incorrecto'), false);
  assert.equal(authorizedCron(`Bearer ${'a'.repeat(40)}`), true);
  process.env.CRON_SECRET = 'REEMPLAZAR' + 'a'.repeat(35);
  assert.equal(authorizedCron(`Bearer ${process.env.CRON_SECRET}`), false);
  process.env.CRON_SECRET = 'short';
  assert.equal(authorizedCron('Bearer short'), false);
  if (previous === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous;
});
