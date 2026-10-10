import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'modules', 'sales', 'sales.controller.ts');

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(FILE, FILE + '.bak-ctorfix-' + ts);

let src = fs.readFileSync(FILE, 'utf8');
const wasCRLF = src.includes('\r\n');
let srcN = src.replace(/\r\n/g, '\n');
const lines = srcN.split('\n');

// پیدا کردن خط اشتباه
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  // خط فقط شامل softDelete بدون constructor
  if (/^private\s+softDelete:\s*SoftDeleteService\s*,?$/.test(l)) {
    // چک کن آیا خط قبلی constructor هست یا نه
    const prev = lines[i - 1]?.trim() || '';
    if (!prev.includes('constructor(') && !prev.endsWith(',')) {
      // این خط اضافیه — حذف
      console.log(`🗑 خط ${i + 1} (اضافی) حذف شد:`, l);
      lines.splice(i, 1);
      i--;
    }
  }
}

// حالا constructor تک‌خطی رو پیدا کن و درست patch کن
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(\s*constructor\s*\()([^)]*)(\)\s*\{.*\})/);
  if (!m) continue;
  const params = m[2].trim();
  if (params.includes('SoftDeleteService')) continue;

  const indent = m[1].match(/^\s*/)[0];
  // تبدیل به چندخطی
  const newParams = params
    ? `${params},\n${indent}  private softDelete: SoftDeleteService,`
    : `\n${indent}  private softDelete: SoftDeleteService,\n${indent}`;

  const closeMatch = m[3].match(/\)\s*\{/);
  const closing = closeMatch ? ')' : ')';
  const afterBrace = m[3].substring(m[3].indexOf('{'));

  lines[i] = `${m[1]}${newParams}${closing} ${afterBrace}`;
  console.log(`✅ خط ${i + 1} fix شد`);
}

fs.writeFileSync(FILE, wasCRLF ? lines.join('\n').replace(/\n/g, '\r\n') : lines.join('\n'), 'utf8');
console.log('✅ ذخیره شد');