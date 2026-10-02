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

const patterns = [
  { name: 'toast', regex: /toast\.(success|error|info|warning)\(\s*['"`]([A-Za-z][^'"`]{2,80})['"`]/g },
  { name: 'placeholder', regex: /placeholder=["']([A-Za-z][^"']{3,60})["']/g },
  { name: 'title', regex: /title=["']([A-Za-z][^"']{3,60})["']/g },
  { name: 'aria-label', regex: /aria-label=["']([A-Za-z][^"']{3,60})["']/g },
];

const files = walk(ROOT);
const findings = [];

for (const f of files) {
  try {
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split('\n');
    lines.forEach((line, idx) => {
      for (const p of patterns) {
        const regex = new RegExp(p.regex.source, 'g');
        let m;
        while ((m = regex.exec(line)) !== null) {
          findings.push({
            file: f.replace(ROOT, 'src'),
            line: idx + 1,
            type: p.name,
            text: m[0].substring(0, 90),
          });
        }
      }
    });
  } catch {}
}

const byFile = {};
for (const f of findings) {
  if (!byFile[f.file]) byFile[f.file] = [];
  byFile[f.file].push(f);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  متن\u200Cهای انگلیسی باقی\u200Cمانده در پاپ\u200Cآپ\u200Cها');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('کل: ' + findings.length + ' مورد در ' + Object.keys(byFile).length + ' فایل\n');

let count = 0;
for (const [file, items] of Object.entries(byFile)) {
  if (count >= 25) { console.log('... و ' + (Object.keys(byFile).length - 25) + ' فایل دیگر'); break; }
  console.log('📄 ' + file + ' (' + items.length + ')');
  items.slice(0, 4).forEach((it) => {
    console.log('   L' + it.line + ' [' + it.type + ']: ' + it.text);
  });
  if (items.length > 4) console.log('   ... و ' + (items.length - 4) + ' مورد');
  console.log('');
  count++;
}