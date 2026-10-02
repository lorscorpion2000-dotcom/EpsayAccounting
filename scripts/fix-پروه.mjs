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

// کلماتی که واقعا غلط هستند (بصری هم دیده میشوند)
const fixes = [
  // "پروه" بدون  → "پروه"
  [/\bپروه\b/g, 'پروه'],
  [/\bپروها\b/g, 'پروه\u200Cها'],
  [/\bپروهای\b/g, 'پروه\u200Cهای'],
  [/\bپروهی\b/g, 'پروه\u200Cای'],
  [/\bپروه\u200Cها\b/g, 'پروه\u200Cها'],
  [/\bپروه\u200Cهای\b/g, 'پروه\u200Cهای'],
];

const files = walk(ROOT);
let totalChanged = 0;
const changedFiles = [];

for (const f of files) {
  try {
    const original = fs.readFileSync(f, 'utf8');
    let c = original;
    let count = 0;

    for (const [pattern, repl] of fixes) {
      const before = c;
      c = c.replace(pattern, repl);
      if (c !== before) {
        const matches = before.match(pattern);
        count += matches ? matches.length : 1;
      }
    }

    if (c !== original) {
      // Backap
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
console.log('  فایل\u200Cهای اصلاحشده: ' + changedFiles.length);
console.log('  کل تغییرات: ' + totalChanged);
console.log('═══════════════════════════════════════════════════════════\n');

for (const cf of changedFiles) {
  console.log('✅ ' + cf.file + ' (' + cf.count + ')');
}

if (changedFiles.length === 0) {
  console.log('ℹ هیچ فایل نیاز به اصلاح نداشت');
}