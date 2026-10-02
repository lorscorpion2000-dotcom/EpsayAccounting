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

// فقط رشتههای دقیق (بدون \b)
const fixes = [
  ['پروه\u200Cها', 'پروه\u200Cها'],
  ['پروه\u200Cهای', 'پروه\u200Cهای'],
  ['پروهای', 'پروه\u200Cای'],
  ['پروهی', 'پروه\u200Cای'],
  ['پروها', 'پروه\u200Cها'],
  ['پروه', 'پروه'],
];

const files = walk(ROOT);
let totalChanged = 0;
const changedFiles = [];

for (const f of files) {
  try {
    const original = fs.readFileSync(f, 'utf8');
    let c = original;
    let count = 0;

    for (const [from, to] of fixes) {
      while (c.includes(from)) {
        c = c.replace(from, to);
        count++;
      }
    }

    if (c !== original) {
      fs.writeFileSync(f + '.bak-zh', original, 'utf8');
      fs.writeFileSync(f, c, 'utf8');
      totalChanged += count;
      changedFiles.push({ file: f.replace(ROOT, 'src'), count });
    }
  } catch (e) {
    console.log('X ' + f + ': ' + e.message);
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  فایل\u200Cهای اصلاح\u200Cشده: ' + changedFiles.length);
console.log('  کل تغییرات: ' + totalChanged);
console.log('═══════════════════════════════════════════════════════════\n');

for (const cf of changedFiles) {
  console.log('✅ ' + cf.file + ' (' + cf.count + ')');
}

if (changedFiles.length === 0) {
  console.log('ℹ هیچ فایل نیاز به اصلاح نداشت');
}