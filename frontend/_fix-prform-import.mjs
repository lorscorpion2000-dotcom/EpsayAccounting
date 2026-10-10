import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC = path.join(__dirname, 'src');

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.')) continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if ((f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('.bak')) files.push(full);
  }
}
walk(SRC);

let fixed = 0;

for (const fullPath of files) {
  let src = fs.readFileSync(fullPath, 'utf8');
  if (!src.includes("import { todayLocalISO }")) continue;

  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  // پیدا کردن خط todayLocalISO
  const lines = srcN.split('\n');
  const idx = lines.findIndex(l => l.includes("import { todayLocalISO } from '@/utils/local-date';"));
  if (idx < 0) continue;

  // چک کن آیا داخل یک import چندخطیه؟
  let isInsideMultiline = false;
  // برگرد عقب: دنبال `import {` یا `import {` در خطوط بالا
  let openIdx = -1;
  for (let i = idx - 1; i >= Math.max(0, idx - 10); i--) {
    const l = lines[i].trim();
    if (l.endsWith('} from') || l.endsWith("';") || l.endsWith('";')) {
      // یه import کامل بالای این خط
      break;
    }
    if (l === 'import {' || l.startsWith('import {')) {
      openIdx = i;
      isInsideMultiline = true;
      break;
    }
  }

  if (!isInsideMultiline) continue;

  // خط todayLocalISO رو حذف کن
  const importLine = lines.splice(idx, 1)[0];

  // پیدا کردن خط بسته شدن import چندخطی (از خط openIdx به بعد)
  let closeIdx = -1;
  for (let i = openIdx; i < Math.min(lines.length, openIdx + 20); i++) {
    if (/from\s+['"][^'"]+['"];?\s*$/.test(lines[i])) {
      closeIdx = i;
      break;
    }
  }

  if (closeIdx < 0) continue;

  // اضافه بعد از closeIdx
  lines.splice(closeIdx + 1, 0, importLine);

  srcN = lines.join('\n');
  fs.writeFileSync(fullPath, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  console.log('✅', fullPath.replace(__dirname, '').replace(/^[\\\/]/, ''));
  fixed++;
}

console.log(`\n✅ ${fixed} فایل fix شد`);