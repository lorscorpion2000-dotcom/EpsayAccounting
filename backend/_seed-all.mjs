// _seed-all.mjs v2 — master seed: run all seed steps in correct order
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

const steps = [
  {
    name: '۱/۶ پایه (roles, users, core perms)',
    cmd: 'npx ts-node prisma/seed.ts',
    check: 'prisma/seed.ts',
  },
  {
    name: '۲/۶ کدینگ حساب‌ها',
    cmd: 'npx ts-node prisma/seed-accounting.ts',
    check: 'prisma/seed-accounting.ts',
  },
  {
    name: '۳/۶ حساب‌های گم + mapping پایه',
    cmd: 'node _seed-extra.mjs',
    check: '_seed-extra.mjs',
  },
  {
    name: '۴/۶ حساب‌های ماشین + mapping B3',
    cmd: 'node _b3-0.mjs',
    check: '_b3-0.mjs',
  },
  {
    name: '۵/۶ اسکن و ساخت permission گم',
    cmd: 'node _scan-perms.mjs',
    check: '_scan-perms.mjs',
  },
  {
    name: '۶/۶ قالب‌های قرارداد',
    cmd: 'node _b15-3-seed.mjs',
    check: '_b15-3-seed.mjs',
  },
];

console.log('═══ MASTER SEED ═══');

let failed = 0;
for (const s of steps) {
  const abs = path.join(cwd, s.check);
  if (!fs.existsSync(abs)) {
    console.log('');
    console.log('[~] ' + s.name + ' — skipped');
    console.log('    file not found: ' + abs);
    continue;
  }
  console.log('');
  console.log('▶ ' + s.name);
  try {
    execSync(s.cmd, { cwd, stdio: 'inherit' });
    console.log('✓ ' + s.name);
  } catch (e) {
    console.error('✗ ' + s.name + ' — failed with exit code ' + e.status);
    failed++;
  }
}

console.log('');
if (failed === 0) {
  console.log('═══ ALL DONE ═══');
  console.log('اکنون سرویس را ری‌استارت کن:');
  if (process.platform === 'win32') {
    console.log('  powershell -ExecutionPolicy Bypass -File E:\\EpsayAccounting\\rebuild-restart.ps1');
  }
} else {
  console.log('═══ ' + failed + ' STEP(S) FAILED ═══');
  console.log('دستور خطادار را دستی بررسی کن.');
  process.exit(1);
}