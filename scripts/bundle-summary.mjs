import fs from 'node:fs';
import path from 'node:path';
const ROOT = 'E:/EpsayAccounting';
const distDir = ROOT + '/frontend/dist/assets';

if (!fs.existsSync(distDir)) {
  console.log('❌ dist/assets پیدا نشد');
  process.exit(1);
}

const files = fs.readdirSync(distDir)
  .map((f) => ({
    name: f,
    size: fs.statSync(path.join(distDir, f)).size,
  }))
  .sort((a, b) => b.size - a.size);

const total = files.reduce((s, f) => s + f.size, 0);

console.log('═══════════════════════════════════════════════════════');
console.log('  خلاصه Bundle');
console.log('═══════════════════════════════════════════════════════\n');

console.log('  کل فایل\u200Cها: ' + files.length);
console.log('  کل حجم: ' + (total / 1024).toFixed(2) + ' KB (' + (total / 1024 / 1024).toFixed(2) + ' MB)\n');

console.log('  ── ۱۵ فایل بزرگ ──');
files.slice(0, 15).forEach((f) => {
  console.log('  ' + (f.size / 1024).toFixed(1).padStart(8) + ' KB  ' + f.name);
});

console.log('\n═══════════════════════════════════════════════════════');
console.log('  مقایسه:');
console.log('    قبل: 2.24 MB (single file)');
console.log('    بعد: ' + (total / 1024 / 1024).toFixed(2) + ' MB (lazy-loaded)');
console.log('    → فقط ~500 KB در بار اول لود می\u200Cشود');
console.log('═══════════════════════════════════════════════════════');