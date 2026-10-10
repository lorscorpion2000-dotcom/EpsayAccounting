import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'modules', 'sales', 'sales.controller.ts');

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(FILE, FILE + '.bak-fixsales-' + ts);
console.log('✅ بکاپ');

let src = fs.readFileSync(FILE, 'utf8');
const wasCRLF = src.includes('\r\n');
let srcN = src.replace(/\r\n/g, '\n');

const lines = srcN.split('\n');

// پیدا کردن SalesPaymentsController و constructor اون
let ctrlStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('class SalesPaymentsController')) {
    ctrlStart = i;
    break;
  }
}

if (ctrlStart < 0) {
  console.log('❌ SalesPaymentsController پیدا نشد');
  process.exit(1);
}

// پیدا کردن constructor در محدوده این کلاس
let ctorIdx = -1;
for (let i = ctrlStart; i < Math.min(ctrlStart + 30, lines.length); i++) {
  if (lines[i].includes('constructor(')) {
    ctorIdx = i;
    break;
  }
}

if (ctorIdx < 0) {
  // اگه constructor نداره، اضافه کن بعد از خط class
  console.log('⚠️  constructor نداره — اضافه می‌کنم');

  // پیدا کردن آخر خط class {
  let braceIdx = ctrlStart;
  while (braceIdx < lines.length && !lines[braceIdx].endsWith('{')) braceIdx++;

  // اضافه کردن constructor
  lines.splice(braceIdx + 1, 0,
    '  constructor(private softDelete: SoftDeleteService) {}',
    ''
  );
  console.log('✅ constructor اضافه شد');
} else {
  // constructor داره — چک کن softDelete داخلشه یا نه
  // پیدا کردن آخر constructor
  let depth = 0, ctorEnd = ctorIdx;
  for (let i = ctorIdx; i < Math.min(ctorIdx + 20, lines.length); i++) {
    depth += (lines[i].match(/\(/g) || []).length;
    depth -= (lines[i].match(/\)/g) || []).length;
    if (depth <= 0 && i > ctorIdx && lines[i].includes(')')) {
      ctorEnd = i;
      break;
    }
  }

  const ctorBlock = lines.slice(ctorIdx, ctorEnd + 1).join('\n');
  console.log('Constructor فعلی:');
  console.log(ctorBlock);
  console.log('');

  if (!ctorBlock.includes('SoftDeleteService')) {
    // اضافه قبل از ) بسته
    const openIdx = lines.findIndex((l, i) => i >= ctorIdx && l.includes('constructor('));
    const closeLine = lines.findIndex((l, i) => i >= ctorIdx && l.trim().startsWith(')'));
    if (closeLine > 0) {
      // چک کن خط قبلی ویرگول داره یا نه
      const prevLine = lines[closeLine - 1];
      const needsComma = !prevLine.trim().endsWith(',');
      const inject = '    private softDelete: SoftDeleteService' + (needsComma ? ',' : '');
      // اضافه
      if (needsComma) {
        lines[closeLine - 1] = prevLine.replace(/,?\s*$/, ',');
      }
      lines.splice(closeLine, 0, inject);
      console.log('✅ softDelete به constructor اضافه شد');
    }
  } else {
    console.log('ℹ️  از قبل inject شده');
  }
}

fs.writeFileSync(FILE, wasCRLF ? lines.join('\n').replace(/\n/g, '\r\n') : lines.join('\n'), 'utf8');
console.log('✅ ذخیره شد');