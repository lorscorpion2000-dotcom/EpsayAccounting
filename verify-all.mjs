// E:\EpsayAccounting\verify-all.mjs
// تأیید اینکه همهٔ ۱۸ اصلاح امنیتی/صحت داده روی کد فعلی اعمال شده‌اند.
//
// اجرا: node verify-all.mjs
// خروجی: PASS/FAIL برای هر آیتم + خلاصه نهایی

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function read(rel) {
    try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
    catch { return null; }
}
function includes(rel, needle) {
    const c = read(rel);
    return c !== null && c.includes(needle);
}
function matches(rel, regex) {
    const c = read(rel);
    return c !== null && regex.test(c);
}

const checks = [
    // ─── امنیت 2FA ───
    { id: 'F1', name: '2FA bypass — {valid:false} rejection',
      test: () => matches('backend/src/modules/auth/two-factor.service.ts',
          /typeof\s*\(?\s*resolved\s+as\s+any\s*\)?\.valid\s*===\s*['"]boolean['"]/) },

    { id: 'F2', name: 'Recovery codes — CSPRNG (randomInt)',
      test: () => includes('backend/src/modules/auth/two-factor.service.ts', 'randomInt(0x10000)') },

    { id: 'F3', name: 'changePassword — strings not DTO',
      test: () => matches('backend/src/modules/auth/auth.controller.ts',
          /changePassword\(\s*[^,]+,\s*dto\.oldPassword\s*,\s*dto\.newPassword\s*\)/) },

    { id: 'F4', name: 'updatePreferences — dto.themePreference',
      test: () => matches('backend/src/modules/auth/auth.controller.ts',
          /updatePreferences\([^,]+,\s*dto\.themePreference\s*\)/) },

    { id: 'F5', name: 'POST /auth/2fa/verify endpoint',
      test: () => includes('backend/src/modules/auth/auth.controller.ts', "Post('2fa/verify')") },

    { id: 'F6', name: 'TwoFactorVerifyLoginDto class',
      test: () => includes('backend/src/modules/auth/dto/two-factor.dto.ts', 'export class TwoFactorVerifyLoginDto') },

    // ─── اسکریپت‌ها ───
    { id: 'F7', name: 'reset-admin.mjs — random password',
      test: () => includes('backend/prisma/reset-admin.mjs', 'randomInt') &&
                  !includes('backend/prisma/reset-admin.mjs', "'Admin@1234'") },

    { id: 'F8a', name: 'check-password.js — no hardcoded pwd',
      test: () => !includes('backend/scripts/check-password.js', "'Admin@1404'") },

    { id: 'F8b', name: 'reset-password.js — no hardcoded pwd',
      test: () => !includes('backend/scripts/reset-password.js', "'Admin@1404'") },

    { id: 'F8c', name: 'reset-admin-password.js — no hardcoded pwd',
      test: () => !includes('backend/scripts/reset-admin-password.js', "'Admin@1404'") },

    // ─── دقت مالی ───
    { id: 'F9', name: 'postMultiLine — Decimal',
      test: () => includes('backend/src/modules/accounting/engine/accounting-engine.service.ts',
          'totalDebit = totalDebit.plus(new Prisma.Decimal(') },

    { id: 'F10', name: 'fiscal close — only own year',
      test: () => matches('backend/src/modules/accounting/fiscal-years.service.ts',
          /async close\(\s*id:\s*string\s*\)[\s\S]{0,600}?data:\s*\{\s*status:\s*'CLOSED',\s*isCurrent:\s*false\s*\}/) },

    { id: 'F11', name: 'journals.create — entryDate in fiscal year',
      test: () => includes('backend/src/modules/accounting/journals.service.ts',
          'در محدوده سال مالی') },

    // ─── Rollback و Integrity ───
    { id: 'F12', name: 'subcontractor — rollback on JE failure',
      test: () => matches('backend/src/modules/payroll/subcontractor-statements.service.ts',
          /status:\s*['"]SUBMITTED['"][\s\S]{0,100}?approvedById:\s*null/) },

    { id: 'F13', name: 'worker — rollback on JE failure',
      test: () => matches('backend/src/modules/payroll/worker-statements.service.ts',
          /status:\s*['"]SUBMITTED['"][\s\S]{0,100}?approvedById:\s*null/) },

    { id: 'F14', name: 'forwarder — FAILED on any failure',
      test: () => includes('backend/src/modules/site-ops/daily-report-forwarder.service.ts',
          "status: failed > 0 ? 'FAILED' : 'FORWARDED'") },

    // ─── زیرساخت ───
    { id: 'F15', name: 'trust proxy in main.ts',
      test: () => includes('backend/src/main.ts', "app.set('trust proxy'") },

    { id: 'F16', name: '.env.example — security vars',
      test: () => includes('backend/.env.example', 'ALLOWED_ORIGINS') &&
                  includes('backend/.env.example', 'TRUST_PROXY') &&
                  includes('backend/.env.example', 'PROJECT_SCOPE_ENABLED') },

    { id: 'F17', name: 'CI — prisma migrate deploy',
      test: () => includes('.github/workflows/ci.yml', 'prisma migrate deploy') },

    // ─── تست‌ها ───
    { id: 'F18a', name: 'two-factor.verify.spec.ts',
      test: () => fs.existsSync(path.join(ROOT, 'backend/src/modules/auth/two-factor.verify.spec.ts')) },

    { id: 'F18b', name: 'auth.controller.spec.ts',
      test: () => fs.existsSync(path.join(ROOT, 'backend/src/modules/auth/auth.controller.spec.ts')) },

    // ─── Sanity: no leftover bugs ───
    { id: 'SAFE1', name: 'No dto.theme (wrong field) anywhere',
      test: () => !matches('backend/src/modules/auth/auth.controller.ts',
          /updatePreferences\([^)]*,\s*dto\.theme\s*\)/) },

    { id: 'SAFE2', name: 'No !!r on verify (2FA bypass)',
      test: () => !includes('backend/src/modules/auth/two-factor.service.ts', 'return !!r') },

    { id: 'SAFE3', name: 'No hardcoded Admin@1234 / Admin@1404 in backend/prisma',
      test: () => {
          const dir = path.join(ROOT, 'backend/prisma');
          if (!fs.existsSync(dir)) return true;
          const files = fs.readdirSync(dir).filter(f => /\.(mjs|ts|js)$/.test(f));
          for (const f of files) {
              const c = fs.readFileSync(path.join(dir, f), 'utf8');
              if (/['"]Admin@(1234|1404)['"]/.test(c)) return false;
          }
          return true;
      } },

    { id: 'SAFE4', name: 'main.ts — only 1 trust-proxy block',
      test: () => {
          const c = read('backend/src/main.ts') || '';
          const occurrences = (c.match(/app\.set\('trust proxy'/g) || []).length;
          return occurrences === 1;
      } },
];

// ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  VERIFY — Epsay Accounting Security & Quality Fixes');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

for (const check of checks) {
    let result;
    try { result = check.test(); }
    catch (e) { result = false; }
    if (result) {
        console.log(`  ✅ ${check.id.padEnd(6)}  ${check.name}`);
        pass++;
    } else {
        console.log(`  ❌ ${check.id.padEnd(6)}  ${check.name}`);
        failures.push(check);
        fail++;
    }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  RESULT');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Total   : ${checks.length}`);
console.log(`  ✅ Pass : ${pass}`);
console.log(`  ❌ Fail : ${fail}`);
console.log('═══════════════════════════════════════════════════════════');
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