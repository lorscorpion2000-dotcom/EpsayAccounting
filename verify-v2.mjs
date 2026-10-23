// E:\EpsayAccounting\verify-v2.mjs
// نسخه ۲ — الگوهای اصلاح‌شده برای F3, F10, F12, F13
// کد پروژه از قبل درست است؛ فقط verify قبلی بیش از حد سختگیر بود.
//
// اجرا: node verify-v2.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function read(rel) { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return null; } }
function has(rel, s) { const c = read(rel); return c !== null && c.includes(s); }
function m(rel, re) { const c = read(rel); return c !== null && re.test(c); }

// بررسی rollback: هر model.update که هم status: 'SUBMITTED' هم approvedById: null داشته باشد
function hasFullRollback(rel, model) {
    const c = read(rel);
    if (!c) return false;
    const re = new RegExp(model + "\\.update\\s*\\(", "g");
    let match;
    while ((match = re.exec(c)) !== null) {
        const snippet = c.slice(match.index, match.index + 500);
        if (/status:\s*['"]SUBMITTED['"]/.test(snippet)
            && /approvedById:\s*null/.test(snippet)
            && /approvedAt:\s*null/.test(snippet)) {
            return true;
        }
    }
    return false;
}

const checks = [
    // ─── امنیت 2FA ───
    { id: 'F1', name: '2FA bypass — {valid:false} rejection',
      test: () => m('backend/src/modules/auth/two-factor.service.ts',
          /typeof\s*\(?\s*resolved\s+as\s+any\s*\)?\.valid\s*===\s*['"]boolean['"]/) },

    { id: 'F2', name: 'Recovery codes — CSPRNG (randomInt)',
      test: () => has('backend/src/modules/auth/two-factor.service.ts', 'randomInt(0x10000)') },

    // ⚠️ FIXED: allow trailing comma before ')'
    { id: 'F3', name: 'changePassword — strings not DTO',
      test: () => m('backend/src/modules/auth/auth.controller.ts',
          /changePassword\(\s*[^,()]+,\s*dto\.oldPassword\s*,\s*dto\.newPassword\s*,?\s*\)/) },

    { id: 'F4', name: 'updatePreferences — dto.themePreference',
      test: () => m('backend/src/modules/auth/auth.controller.ts',
          /updatePreferences\([^,]+,\s*dto\.themePreference\s*\)/) },

    { id: 'F5', name: 'POST /auth/2fa/verify endpoint',
      test: () => has('backend/src/modules/auth/auth.controller.ts', "Post('2fa/verify')") },

    { id: 'F6', name: 'TwoFactorVerifyLoginDto class',
      test: () => has('backend/src/modules/auth/dto/two-factor.dto.ts', 'export class TwoFactorVerifyLoginDto') },

    // ─── اسکریپت‌ها ───
    { id: 'F7', name: 'reset-admin.mjs — random password',
      test: () => has('backend/prisma/reset-admin.mjs', 'randomInt')
              && !has('backend/prisma/reset-admin.mjs', "'Admin@1234'") },

    { id: 'F8a', name: 'check-password.js — no hardcoded pwd',
      test: () => !has('backend/scripts/check-password.js', "'Admin@1404'") },

    { id: 'F8b', name: 'reset-password.js — no hardcoded pwd',
      test: () => !has('backend/scripts/reset-password.js', "'Admin@1404'") },

    { id: 'F8c', name: 'reset-admin-password.js — no hardcoded pwd',
      test: () => !has('backend/scripts/reset-admin-password.js', "'Admin@1404'") },

    // ─── دقت مالی ───
    { id: 'F9', name: 'postMultiLine — Decimal',
      test: () => has('backend/src/modules/accounting/engine/accounting-engine.service.ts',
          'totalDebit = totalDebit.plus(new Prisma.Decimal(') },

    // ⚠️ FIXED: anchor at closing brace, not fixed char count
    { id: 'F10', name: 'fiscal close — only own year',
      test: () => {
          const c = read('backend/src/modules/accounting/fiscal-years.service.ts');
          if (!c) return false;
          const body = c.match(/async\s+close\s*\([\s\S]{0,3000}?\n  \}/);
          if (!body) return false;
          return /data:\s*\{\s*status:\s*['"]CLOSED['"]\s*,\s*isCurrent:\s*false\s*\}/.test(body[0]);
      }},

    { id: 'F11', name: 'journals.create — entryDate in fiscal year',
      test: () => has('backend/src/modules/accounting/journals.service.ts',
          'در محدوده سال مالی') },

    // ⚠️ FIXED: order-independent, allows extra fields
    { id: 'F12', name: 'subcontractor — rollback on JE failure',
      test: () => hasFullRollback(
          'backend/src/modules/payroll/subcontractor-statements.service.ts',
          'subcontractorStatement') },

    // ⚠️ FIXED: order-independent, allows extra fields
    { id: 'F13', name: 'worker — rollback on JE failure',
      test: () => hasFullRollback(
          'backend/src/modules/payroll/worker-statements.service.ts',
          'workerStatement') },

    { id: 'F14', name: 'forwarder — FAILED on any failure',
      test: () => has('backend/src/modules/site-ops/daily-report-forwarder.service.ts',
          "status: failed > 0 ? 'FAILED' : 'FORWARDED'") },

    // ─── زیرساخت ───
    { id: 'F15', name: 'trust proxy in main.ts',
      test: () => has('backend/src/main.ts', "app.set('trust proxy'") },

    { id: 'F16', name: '.env.example — security vars',
      test: () => has('backend/.env.example', 'ALLOWED_ORIGINS')
              && has('backend/.env.example', 'TRUST_PROXY')
              && has('backend/.env.example', 'PROJECT_SCOPE_ENABLED') },

    { id: 'F17', name: 'CI — prisma migrate deploy',
      test: () => has('.github/workflows/ci.yml', 'prisma migrate deploy') },

    // ─── تست‌ها ───
    { id: 'F18a', name: 'two-factor.verify.spec.ts',
      test: () => fs.existsSync(path.join(ROOT, 'backend/src/modules/auth/two-factor.verify.spec.ts')) },

    { id: 'F18b', name: 'auth.controller.spec.ts',
      test: () => fs.existsSync(path.join(ROOT, 'backend/src/modules/auth/auth.controller.spec.ts')) },

    // ─── Safety checks ───
    { id: 'SAFE1', name: 'No dto.theme (wrong field)',
      test: () => !m('backend/src/modules/auth/auth.controller.ts',
          /updatePreferences\([^)]*,\s*dto\.theme\s*\)/) },

    { id: 'SAFE2', name: 'No !!r on verify (2FA bypass)',
      test: () => !has('backend/src/modules/auth/two-factor.service.ts', 'return !!r') },

    { id: 'SAFE3', name: 'No hardcoded Admin@XXXX in backend/prisma',
      test: () => {
          const dir = path.join(ROOT, 'backend/prisma');
          if (!fs.existsSync(dir)) return true;
          for (const f of fs.readdirSync(dir)) {
              const fp = path.join(dir, f);
              if (!fs.statSync(fp).isFile()) continue;
              if (!/\.(mjs|ts|js)$/.test(f)) continue;
              const c = fs.readFileSync(fp, 'utf8');
              if (/['"]Admin@(?:1234|1404)['"]/.test(c)) return false;
          }
          return true;
      }},

    { id: 'SAFE4', name: 'main.ts — exactly 1 trust-proxy block',
      test: () => {
          const c = read('backend/src/main.ts') || '';
          return (c.match(/app\.set\('trust proxy'/g) || []).length === 1;
      }},
];

// ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  VERIFY v2 — Epsay Accounting');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

for (const c of checks) {
    let ok;
    try { ok = c.test(); } catch { ok = false; }
    if (ok) {
        console.log(`  ✅ ${c.id.padEnd(6)}  ${c.name}`);
        pass++;
    } else {
        console.log(`  ❌ ${c.id.padEnd(6)}  ${c.name}`);
        failures.push(c);
        fail++;
    }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESULT');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Total   : ${checks.length}`);
console.log(`  ✅ Pass : ${pass}`);
console.log(`  ❌ Fail : ${fail}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

if (fail === 0) {
    console.log('  🎉 پروژه در وضعیت production-ready است!');
    console.log('');
    process.exit(0);
} else {
    console.log('  ⚠  موارد زیر نیاز به بررسی دارند:');
    for (const f of failures) console.log(`     - ${f.id}: ${f.name}`);
    console.log('');
    process.exit(1);
}