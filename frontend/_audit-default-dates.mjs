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

console.log('═══ استفاده از new Date().toISOString().slice(0,10) ═══\n');

const issues = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = f.replace(__dirname, '').replace(/^[\\\/]/, '');
  const lines = src.split(/\r?\n/);

  lines.forEach((l, i) => {
    if (/new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/.test(l)) {
      issues.push({ file: rel, line: i + 1, text: l.trim() });
    }
  });
}

for (const x of issues) {
  console.log(`${x.file}:${x.line}`);
  console.log(`   ${x.text.slice(0, 140)}`);
}

console.log(`\n✅ مجموع: ${issues.length}`);