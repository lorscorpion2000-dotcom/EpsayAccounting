import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting/frontend/src';
const skip = ['node_modules', '.git', 'dist', 'build'];

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(item.name)) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
console.log('بررسی ' + files.length + ' فایل...\n');

const problems = [];
const suspiciousWords = [
  'پروه', 'پروها', 'پروهای', 'م', 'مه',
  'گزارشها', 'هزنهها', 'کارها', 'مدارک',
];

for (const f of files) {
  try {
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split('\n');
    lines.forEach((line, idx) => {
      for (const w of suspiciousWords) {
        if (line.includes(w)) {
          problems.push({
            file: f.replace(ROOT, 'src'),
            line: idx + 1,
            word: w,
            text: line.trim().slice(0, 100),
          });
        }
      }
      // حرف عربی  (U+064A) و ك (U+0643) که باید ی و ک فارسی شوند
      if (/[\u064A\u0643]/.test(line)) {
        problems.push({
          file: f.replace(ROOT, 'src'),
          line: idx + 1,
          word: 'حرف عربی',
          text: line.trim().slice(0, 100),
        });
      }
    });
  } catch {}
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  مشکلات پیدا شده: ' + problems.length);
console.log('═══════════════════════════════════════════════════════════\n');

const grouped = {};
for (const p of problems) {
  if (!grouped[p.file]) grouped[p.file] = [];
  grouped[p.file].push(p);
}

for (const [file, items] of Object.entries(grouped).slice(0, 30)) {
  console.log('📄 ' + file + ' (' + items.length + ' مورد)');
  items.slice(0, 3).forEach((p) => {
    console.log('   L' + p.line + ' [' + p.word + ']: ' + p.text);
  });
  if (items.length > 3) console.log('   ... و ' + (items.length - 3) + ' مورد دیگر');
  console.log('');
}

if (Object.keys(grouped).length > 30) {
  console.log('... و ' + (Object.keys(grouped).length - 30) + ' فایل دیگر');
}