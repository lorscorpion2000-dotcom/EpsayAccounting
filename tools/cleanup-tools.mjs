// پاکسازی tools/ — اسکریپت‌های one-off رو پاک می‌کنه
import fs from 'node:fs';
import path from 'node:path';

const TOOLS = 'E:\\EpsayAccounting\\tools';

// فایل‌هایی که باید بمانند
const KEEP = new Set([
  'monitor-services.ps1',
  'cleanup-logs.ps1',
  'daily-alerts.ps1',
  'telegram.config.json',
  'fix-jwt-secrets.mjs',
  'gen-jwt-secret.mjs',
  'restart-epsay.ps1',
  'cleanup-tools.mjs', // خود این اسکریپت
]);

// لیست همه فایل‌ها
const files = fs.readdirSync(TOOLS).filter(f => {
  const full = path.join(TOOLS, f);
  return fs.statSync(full).isFile();
});

console.log(`📁 کل فایل‌ها: ${files.length}`);
console.log(`🟢 نگه‌داشتن: ${files.filter(f => KEEP.has(f)).length}`);
console.log(`🔴 حذف: ${files.filter(f => !KEEP.has(f)).length}\n`);

// نمایش
console.log('--- نگه‌داشتن ---');
files.filter(f => KEEP.has(f)).forEach(f => console.log(`  ✅ ${f}`));

console.log('\n--- حذف ---');
const toDelete = files.filter(f => !KEEP.has(f));
toDelete.forEach(f => console.log(`  🗑️  ${f}`));

// تأیید از کاربر
console.log('\n⚠️  برای حذف، این اسکریپت رو با آرگومان --confirm اجرا کن:');
console.log('     node tools/cleanup-tools.mjs --confirm\n');

if (!process.argv.includes('--confirm')) {
  console.log('⏸️  حالت dry-run — چیزی حذف نشد.');
  process.exit(0);
}

// حذف
let deleted = 0;
let failed = 0;
for (const f of toDelete) {
  try {
    fs.unlinkSync(path.join(TOOLS, f));
    deleted++;
  } catch (e) {
    console.log(`  ❌ خطا در حذف ${f}: ${e.message}`);
    failed++;
  }
}

console.log(`\n✅ حذف شد: ${deleted}`);
if (failed) console.log(`❌ خطا: ${failed}`);
console.log('\n--- محتوای نهایی tools/ ---');
fs.readdirSync(TOOLS).forEach(f => {
  const full = path.join(TOOLS, f);
  if (fs.statSync(full).isFile()) console.log(`  ${f}`);
});