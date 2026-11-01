import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('production simulator is explicitly blocked',()=>assert.match(read('src/app/api/simulate/route.ts'),/NODE_ENV==='production'/));
test('server checks actual event body size',()=>assert.match(read('src/app/api/events/route.ts'),/Buffer.byteLength\(raw,'utf8'\)>32768/));
test('secrets excluded from git',()=>assert.match(read('.gitignore'),/^\.env\*/m));
test('security headers configured',()=>assert.match(read('next.config.mjs'),/X-Frame-Options/));
