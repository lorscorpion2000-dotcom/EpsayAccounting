// E:\EpsayAccounting\scripts\fix-api-import.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting/frontend';
const file = path.join(ROOT, 'src/modules/partner-capital/services/partner-capital.api.ts');

console.log('=== تشخیص و رفع خطای @/services/api ===\n');

// 1) بررسی وجود فایل‌های مرجع
console.log('[1] بررسی فایل‌های مرجع:');
const apiFile = path.join(ROOT, 'src/services/api.ts');
const tsconfigFile = path.join(ROOT, 'tsconfig.json');
const viteFile = path.join(ROOT, 'vite.config.ts');

for (const [label, p] of [['api.ts', apiFile], ['tsconfig.json', tsconfigFile], ['vite.config.ts', viteFile]]) {
  if (fs.existsSync(p)) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label} — پیدا نشد!`);
  }
}

// 2) چک BOM و کاراکتر مخفی
console.log('\n[2] بررسی فایل هدف:');
if (!fs.existsSync(file)) {
  console.log(`  ✗ فایل پیدا نشد: ${file}`);
  process.exit(1);
}

const buf = fs.readFileSync(file);
const hasBOM = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
console.log(`  ${hasBOM ? '⚠ BOM دارد' : '✓ BOM ندارد'}`);

// 3) چک کاراکترهای غیرمجاز در خط اول
const content = buf.toString('utf8').replace(/^\uFEFF/, '');
const firstLine = content.split('\n')[0];
console.log(`  خط اول (UTF-8): ${JSON.stringify(firstLine)}`);

// 4) چک کاراکترهای عجیب (zero-width, non-breaking space, smart quotes)
const suspicious = [];
for (let i = 0; i < content.length; i++) {
  const c = content.charCodeAt(i);
  // ZWNBSP, ZWSP, ZWJ, ZWNJ, non-breaking space, smart quotes, arabic digits, etc
  if (
    c === 0xFEFF || // BOM/ZWNBSP
    c === 0x200B || // zero-width space
    c === 0x200C || // ZWNJ
    c === 0x200D || // ZWJ
    c === 0xA0 ||   // non-breaking space
    c === 0x2018 || c === 0x2019 || // smart single quotes
    c === 0x201C || c === 0x201D    // smart double quotes
  ) {
    const line = content.slice(0, i).split('\n').length;
    suspicious.push({ line, char: c.toString(16).padStart(4, '0'), context: content.slice(Math.max(0, i - 10), i + 10) });
  }
}

if (suspicious.length > 0) {
  console.log(`\n  ⚠ ${suspicious.length} کاراکتر مشکوک پیدا شد:`);
  suspicious.slice(0, 10).forEach((s) => {
    console.log(`    خط ${s.line}: U+${s.char} → ...${JSON.stringify(s.context)}...`);
  });
} else {
  console.log('  ✓ هیچ کاراکتر مشکوکی پیدا نشد');
}

// 5) رفع خودکار
console.log('\n[3] رفع خودکار:');

let fixed = content;
// حذف BOM
fixed = fixed.replace(/^\uFEFF/, '');
// حذف zero-width chars
fixed = fixed.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
// جایگزینی smart quotes با straight
fixed = fixed.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
// جایگزینی non-breaking space با space معمولی
fixed = fixed.replace(/\u00A0/g, ' ');

if (fixed !== content) {
  fs.writeFileSync(file, fixed, { encoding: 'utf8' });
  console.log('  ✓ فایل پاک‌سازی و بازنویسی شد (UTF-8 بدون BOM)');
} else {
  console.log('  ℹ نیازی به تغییر نبود — فایل تمیز است');
}

// 6) راهنمای نهایی
console.log('\n=== نتیجه‌گیری ===\n');

console.log('اگر خطا رفع نشد، به ترتیب این کارها را انجام دهید:');
console.log('');
console.log('  ۱) در VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"');
console.log('  ۲) در VS Code: Ctrl+Shift+P → "Developer: Reload Window"');
console.log('  ۳) VS Code را کامل ببندید و فقط پوشه زیر را باز کنید:');
console.log('     ' + ROOT);
console.log('     (نه E:\\EpsayAccounting — فقط frontend)');
console.log('');
console.log('  ۴) اگر باز هم خطا داد، در VS Code یک فایل دیگر مثل');
console.log('     src/modules/accounting/services/accounting.api.ts');
console.log('     را باز کنید — اگر خط ۱ آن هم قرمز است، مشکل VS Code/tsconfig است');
console.log('     اگر آن سبز است ولی فایل شما قرمز، مشکل محتوای فایل است');
console.log('');