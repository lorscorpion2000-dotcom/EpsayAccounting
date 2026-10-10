// backend/test/permissions-coverage.test.mjs
// B1.6 — تست پوشش: هر مسیر HTTP باید یا @RequirePermissions یا @Public داشته باشد
// اجرا: node --test test/permissions-coverage.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');
const MODULES_DIR = join(SRC_DIR, 'modules');

// controllerهایی که اجازه دارند بدون @RequirePermissions باشند
const EXEMPT_CONTROLLERS = new Set([
  'modules/auth/auth.controller.ts',
  'common/health/health.controller.ts',
]);

// استثناهای خاص در سطح متد: 'modules/.../x.controller.ts::ClassName.method'
const EXEMPT_METHODS = new Set([]);

function* walkControllers(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) yield* walkControllers(full);
    else if (item.name.endsWith('.controller.ts')) yield full;
  }
}

const HTTP_DECORATORS = ['Get', 'Post', 'Patch', 'Put', 'Delete', 'Head', 'Options'];
const HTTP_RE = new RegExp(`^\\s*@(${HTTP_DECORATORS.join('|')})\\(`);

function analyzeController(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const out = [];

  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : 'Unknown';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(HTTP_RE);
    if (!m) continue;

    const httpMethod = m[1];
    const pathMatch = line.match(/@\w+\(\s*['"`]?([^'"`)]*)['"`]?\s*\)/);
    const path = pathMatch ? pathMatch[1] : '';

    const start = Math.max(0, i - 6);
    const end = Math.min(lines.length - 1, i + 4);
    let hasPublic = false;
    let hasPermissions = false;
    for (let j = start; j <= end; j++) {
      if (lines[j].includes('@Public(')) hasPublic = true;
      if (lines[j].includes('@RequirePermissions(')) hasPermissions = true;
    }

    let methodName = 'unknown';
    for (let j = i + 1; j <= Math.min(i + 10, lines.length - 1); j++) {
      const nm = lines[j].match(/^\s*(?:async\s+)?(\w+)\s*\(/);
      if (nm) { methodName = nm[1]; break; }
    }

    out.push({ controller: className, method: methodName, httpMethod, path, hasPublic, hasPermissions, lineNumber: i + 1 });
  }

  return out;
}

test('permissions coverage: هر مسیر HTTP یا @RequirePermissions دارد یا @Public', () => {
  const missing = [];
  const total = { controllers: 0, methods: 0, ok: 0 };

  for (const filePath of walkControllers(MODULES_DIR)) {
    const rel = relative(SRC_DIR, filePath).replaceAll('\\', '/');
    const relFromModules = 'modules/' + relative(MODULES_DIR, filePath).replaceAll('\\', '/');

    if (EXEMPT_CONTROLLERS.has(rel)) continue;
    total.controllers++;

    for (const mi of analyzeController(filePath)) {
      total.methods++;
      const key = `${relFromModules}::${mi.controller}.${mi.method}`;
      if (EXEMPT_METHODS.has(key)) { total.ok++; continue; }
      if (mi.hasPublic || mi.hasPermissions) { total.ok++; continue; }
      missing.push(`${rel}:${mi.lineNumber}  @${mi.httpMethod}('${mi.path}')  ${mi.controller}.${mi.method}`);
    }
  }

  console.log(`\n[permissions-coverage] controllers=${total.controllers}  methods=${total.methods}  ok=${total.ok}  missing=${missing.length}`);
  if (missing.length > 0) {
    console.error('\n🔴 مسیرهای بدون کنترل دسترسی:\n' + missing.map(x => '  - ' + x).join('\n') + '\n');
  }
  assert.deepEqual(missing, []);
});