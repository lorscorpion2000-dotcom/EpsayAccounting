// cleanup-all.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting';

// ═══ ۱) اسکریپت‌های موقت در ریشه ═══
const rootFiles = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.mjs'))
  .filter((f) => f !== 'cleanup-all.mjs'); // خود را نگه‌دار

// ═══ ۲) فایل‌های .bak در همه‌جا ═══
const bakFiles = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'logs'].includes(e)) continue;
    const full = path.join(dir, e);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (e.includes('.bak-')) {
      bakFiles.push(full);
    }
  }
}
walk(ROOT);

// ═══ ۳) خروجی txt موقت ═══
const txtFiles = fs.readdirSync(ROOT)
  .filter((f) => f.startsWith('dump-') && f.endsWith('.txt'))
  .map((f) => path.join(ROOT, f));

// ═══ نمایش لیست ═══
console.log('═══════════════════════════════════════════════════');
console.log('📋 اسکریپت‌های موقت در ریشه (' + rootFiles.length + '):');
console.log('═══════════════════════════════════════════════════');
rootFiles.forEach((f) => console.log('   -', f));

console.log('\n═══════════════════════════════════════════════════');
console.log('📋 فایل‌های dump در ریشه (' + txtFiles.length + '):');
console.log('═══════════════════════════════════════════════════');
txtFiles.forEach((f) => console.log('   -', path.basename(f)));

console.log('\n═══════════════════════════════════════════════════');
console.log('📋 فایل‌های بکاپ (.bak-*) در پروژه (' + bakFiles.length + '):');
console.log('═══════════════════════════════════════════════════');
// فقط ۴۰ تای اول را نشان بده
bakFiles.slice(0, 40).forEach((f) => {
  console.log('   -', f.replace(ROOT + '\\', '').replace(/\\/g, '/'));
});
if (bakFiles.length > 40) {
  console.log('   ... و ' + (bakFiles.length - 40) + ' فایل دیگر');
}

const totalSize = [...rootFiles.map((f) => path.join(ROOT, f)), ...txtFiles, ...bakFiles]
  .reduce((s, f) => {
    try { return s + fs.statSync(f).size; } catch { return s; }
  }, 0);

console.log('\n──────────────────────────────────────────────');
console.log('📊 مجموع: ' + (rootFiles.length + txtFiles.length + bakFiles.length) + ' فایل، ' + (totalSize / 1024).toFixed(1) + ' KB');
console.log('──────────────────────────────────────────────\n');

console.log('⚠️  این اسکریپت این فایل‌ها را برای همیشه حذف می‌کند.');
console.log('   (هیچ کد اصلی پروژه آسیب نمی‌بیند)');
console.log('');
console.log('👉 برای حذف تایپ کن: YES');
console.log('');

process.stdin.once('data', (data) => {
  const input = data.toString().trim();
  if (input !== 'YES') {
    console.log('❌ لغو شد. هیچ فایلی حذف نشد.');
    process.exit(0);
  }

  let deleted = 0;
  let failed = 0;

  const all = [
    ...rootFiles.map((f) => path.join(ROOT, f)),
    ...txtFiles,
    ...bakFiles,
  ];

  for (const f of all) {
    try {
      fs.unlinkSync(f);
      deleted++;
    } catch (e) {
      failed++;
      console.error('❌ خطا در حذف:', f, e.message);
    }
  }

  console.log('');
  console.log('✅ ' + deleted + ' فایل حذف شد.');
  if (failed > 0) console.log('⚠️  ' + failed + ' فایل حذف نشد.');
  process.exit(0);
});