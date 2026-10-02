import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting';
const skip = ['node_modules', '.git', 'dist', 'build'];

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(item.name) && !item.name.includes('.bak')) out.push(full);
  }
  return out;
}

// چک: آیا متن دوبار\u200Cانکود شده؟
// الگوهای مشخص mojibake فارسی:
const mojibakePatterns = [
  /Ã˜/g,      // شروع اکثر mojibake فارسی
  /Ã™/g,
  /Ãš/g,
  /Ã¢/g,
  /Ø®Ø·Ø§/g,   // خطا به شکل mojibake
  /Ø³Ø±ÙˆØ±/g,  // سرور
  /Ù…Ø¯ÛŒØ±/g,  // مدیر
  /Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ/g,  // پشتیبانی
];

function isMojibake(text) {
  return /[Ã][\u0080-\u00BF]/.test(text) || /Ã˜|Ã™|Ãš/.test(text);
}

const files = [
  ...walk(ROOT + '/backend/src'),
  ...walk(ROOT + '/frontend/src'),
];

console.log('═══ بررسی ' + files.length + ' فایل ═══\n');

const corrupted = [];

for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    if (isMojibake(content)) {
      corrupted.push({
        path: f,
        rel: f.replace(ROOT, '').replace(/\\/g, '/'),
        size: content.length,
      });
    }
  } catch {}
}

console.log('═══ فایل\u200Cهای mojibake: ' + corrupted.length + ' ═══\n');
corrupted.forEach((c, i) => {
  console.log('  ' + (i + 1) + ') ' + c.rel);
});

// پیشنهاد فیکس
console.log('\n═══ برای اصلاح، فایل fix-encoding.mjs بسازید ═══\n');

// ذخیره لیست فایل\u200Cهای corrupt
const listPath = ROOT + '/scripts/corrupted-files.txt';
fs.writeFileSync(listPath, corrupted.map((c) => c.rel).join('\n'), 'utf8');
console.log('لیست در: ' + listPath);