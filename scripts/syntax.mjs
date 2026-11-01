import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { console.error('Primero ejecutá npm.cmd install para instalar TypeScript.'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
let count = 0;
let errors = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      count++;
      const source = ts.createSourceFile(full, fs.readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true, full.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      for (const diag of source.parseDiagnostics) {
        errors++;
        const loc = source.getLineAndCharacterOfPosition(diag.start ?? 0);
        console.error(`${path.relative(root, full)}:${loc.line + 1}:${loc.character + 1} ${ts.flattenDiagnosticMessageText(diag.messageText, '\n')}`);
      }
    }
  }
}
walk(root);
console.log(`${count} archivos TypeScript/TSX analizados; ${errors} errores de sintaxis.`);
if (errors) process.exit(1);
console.log('NOTA: sintaxis correcta no equivale a npm run typecheck ni npm run build.');
