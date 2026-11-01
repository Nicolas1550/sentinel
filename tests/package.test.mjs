import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');
test('migración V4 conserva tablas y agrega relaciones', () => {
  const sql = read('database/06-ATLAS-V4.sql');
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE)\s+TABLE\b/i);
  for (const table of ['investigation_events', 'sync_runs', 'auth_login_attempts']) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(sql, /ALTER TABLE generated_reports\s+ADD COLUMN IF NOT EXISTS is_public/);
});
test('cron y APIs privadas requieren autorización y ownership', () => {
  assert.match(read('src/app/api/cron/sync/route.ts'), /authorizedCron\(request\.headers\.get\('authorization'\)\)/);
  assert.match(read('src/app/api/investigations/[id]/events/route.ts'), /i\.user_id = \$\{userId\}/);
  assert.match(read('src/app/api/reports/[id]/share/route.ts'), /user_id = \$\{userId\}/);
});
test('sin secretos en la entrega y archivos públicos disponibles', () => {
  assert.equal(existsSync(path.join(root, '.env.local')), false);
  assert.equal(existsSync(path.join(root, 'public/earth-night.jpg')), true);
  assert.equal(existsSync(path.join(root, 'public/og-atlas.jpg')), true);
});
