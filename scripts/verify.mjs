import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'package.json', 'tsconfig.json', 'next.config.ts', 'src/app/page.tsx',
  'src/app/layout.tsx', 'src/app/globals.css',
  'src/components/AtlasDashboard.tsx', 'src/components/Globe.tsx',
  'src/components/TimeMachine.tsx', 'src/components/AnalyticsPanel.tsx',
  'src/components/ResearchDesk.tsx', 'src/components/AlertCenter.tsx',
  'src/components/HistoricalExplorer.tsx', 'src/components/ReportsPanel.tsx',
  'src/lib/usgs.ts', 'src/app/api/alerts/route.ts', 'src/app/api/alerts/check/route.ts',
  'src/app/api/alerts/[id]/route.ts', 'src/app/api/notifications/route.ts',
  'src/app/api/historical/route.ts', 'src/app/api/historical/archive/route.ts',
  'src/app/api/reports/route.ts', 'src/app/api/preferences/route.ts',
  'src/app/api/investigations/route.ts',
  'src/app/api/investigations/[id]/route.ts', 'database/04-ATLAS-V2.sql', 'database/05-ATLAS-V3.sql',
  'src/app/api/earthquakes/route.ts', 'src/app/api/regions/route.ts',
  'src/app/api/health/route.ts', 'src/app/api/auth/register/route.ts',
  'src/app/api/auth/login/route.ts', 'src/app/api/auth/logout/route.ts',
  'src/app/api/auth/me/route.ts', 'src/app/api/favorites/route.ts',
  'src/app/api/favorites/[id]/route.ts',
  'database/00-INSTALAR-TODO.sql', 'database/01-schema.sql', 'database/02-seed-regions.sql',
  'database/03-verificar.sql', '.env.example', 'public/earth-night.jpg',
  'public/og-atlas.jpg', 'README.md',
  'database/06-ATLAS-V4.sql', 'vercel.json',
  'src/lib/seismic.ts', 'src/lib/cron.ts', 'src/lib/login-guard.ts', 'src/lib/usgs-event.ts',
  'src/components/InvestigationWorkspace.tsx', 'src/components/SyncStatus.tsx',
  'src/app/api/cron/sync/route.ts', 'src/app/api/sync/status/route.ts',
  'src/app/api/archive/route.ts',
  'src/app/api/investigations/[id]/events/route.ts',
  'src/app/api/investigations/[id]/events/[eventId]/route.ts',
  'src/app/api/reports/[id]/share/route.ts', 'src/app/report/[token]/page.tsx',
  'tests/seismic.test.mjs', 'tests/package.test.mjs',
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Archivos faltantes:', missing.join(', '));
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.dependencies.next || !pkg.dependencies.three || !pkg.dependencies['@neondatabase/serverless']) {
  throw new Error('Dependencias críticas ausentes.');
}
const schema = fs.readFileSync(path.join(root, 'database/01-schema.sql'), 'utf8');
for (const table of ['users', 'favorites', 'regions']) {
  if (!schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`Tabla ausente: ${table}`);
}
const migration = fs.readFileSync(path.join(root, 'database/04-ATLAS-V2.sql'), 'utf8');
if (!migration.includes('CREATE TABLE IF NOT EXISTS investigations')) throw new Error('Migración V2 incompleta.');
if (/\bDROP\s+TABLE\b/i.test(migration)) throw new Error('Migración destructiva detectada.');
const v3 = fs.readFileSync(path.join(root, 'database/05-ATLAS-V3.sql'), 'utf8');
for (const table of ['alert_rules', 'notifications', 'earthquake_history', 'generated_reports', 'user_preferences']) {
  if (!v3.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`Tabla V3 ausente: ${table}`);
}
if (/\b(DROP|TRUNCATE|ALTER)\s+TABLE\b/i.test(v3)) throw new Error('Migración V3 potencialmente destructiva.');
const v4 = fs.readFileSync(path.join(root, 'database/06-ATLAS-V4.sql'), 'utf8');
for (const table of ['investigation_events', 'sync_runs', 'auth_login_attempts']) {
  if (!v4.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`Tabla V4 ausente: ${table}`);
}
if (/\b(DROP|TRUNCATE)\s+TABLE\b/i.test(v4)) throw new Error('Migración V4 destructiva detectada.');
if (fs.existsSync(path.join(root, '.env.local'))) throw new Error('No distribuyas .env.local en el ZIP.');
const files = [];
function walk(folder) {
  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(item.name)) files.push(file);
  }
}
walk(path.join(root, 'src'));
let badImports = 0;
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  if (code.includes('react-icons/fa6')) throw new Error('Importación obsoleta de react-icons/fa6.');
  // Protege contra comandos de terminal pegados por error en componentes TS/TSX.
  if (/^\s*(?:cat\s+>|(?:TS|TSX|EOF|PY)\s*$|python\s+[^;]+\s+<<)/m.test(code)) {
    console.error('Código de terminal incrustado en archivo fuente:', path.relative(root, file));
    process.exit(1);
  }

  for (const match of code.matchAll(/from\s+['"](@\/[^'"]+)['"]/g)) {
    const target = path.join(root, 'src', match[1].slice(2));
    if (!['.ts', '.tsx', '/index.ts', '/index.tsx'].some(ext => fs.existsSync(target + ext))) {
      console.error('Importación no resuelta:', file, match[1]);
      badImports++;
    }
  }
}
if (badImports) process.exit(1);
console.log(`OK: ${required.length} archivos esenciales, ${files.length} fuentes TS/TSX, 3 tablas originales + migraciones V2/V3/V4 y rutas internas verificadas.`);
console.log('AVISO: esta verificación NO sustituye npm run typecheck ni npm run build.');
