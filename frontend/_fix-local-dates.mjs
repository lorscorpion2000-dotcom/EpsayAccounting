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

let ok = 0, skip = 0;

for (const fullPath of files) {
  let src = fs.readFileSync(fullPath, 'utf8');
  const orig = src;

  // پیدا کردن و جایگزینی همه new Date().toISOString().slice(0, 10)
  const re = /new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/g;
  if (!re.test(src)) continue;

  const count = (src.match(re) || []).length;

  src = src.replace(re, 'todayLocalISO()');

  // اضافه کردن import — مسیر نسبی
  if (!src.includes("from '@/utils/local-date'") && !src.includes('from "../utils/local-date"')) {
    // محاسبه مسیر نسبی
    const rel = path.relative(path.dirname(fullPath), path.join(SRC, 'utils', 'local-date'))
      .replace(/\\/g, '/');
    const importPath = rel.startsWith('.') ? rel : './' + rel;

    // اضافه بعد از آخرین import
    const lines = src.split('\n');
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) lastImport = i;
    }

    // بهتر: از alias استفاده کنیم چون تمیزتره
    lines.splice(lastImport + 1, 0, `import { todayLocalISO } from '@/utils/local-date';`);
    src = lines.join('\n');
  }

  const wasCRLF = orig.includes('\r\n');
  fs.writeFileSync(fullPath, wasCRLF ? src.replace(/\n/g, '\r\n') : src, 'utf8');

  console.log(`✅ ${fullPath.replace(__dirname, '').replace(/^[\\\/]/, '')} (${count} مورد)`);
  ok++;
}

console.log(`\n✅ ${ok} فایل fix شد`);