import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting/frontend/src';
const TARGET = 'ساختار شکست';  // عبارتی که در متغیرها اشتباه درج شده

const skip = ['node_modules', '.git', 'dist', 'build'];

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, out);
    else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
console.log('بررسی ' + files.length + ' فایل...\n');

let totalHits = 0;
const issues = [];

for (const f of files) {
  try {
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split('\n');
    const fileHits = [];
    
    lines.forEach((line, idx) => {
      // دنبال "ساختار شکست" که به انگلیسی چسبیده (نه در string)
      // مثال: `interface ساختار شکستItem {`، `wbsApi.ساختار شکست.tree`، `const ساختار شکست`
      // این‌ها فقط در کد انگلیسی ظاهر می‌شوند (نه در متن فارسی داخل quotes)
      
      // روش: دنبال pattern که "ساختار شکست" به کلمه انگلیسی چسبیده
      if (/[a-zA-Z]ساختار شکست|[a-zA-Z]WBS|ساختار شکست[a-zA-Z]/.test(line)) {
        // رد کن اگر داخل string است (نادر ولی امکان‌پذیر)
        if (/"ساختار شکست"|'ساختار شکست'|`ساختار شکست`/.test(line)) return;
        fileHits.push({ line: idx + 1, text: line.trim().slice(0, 100) });
      }
    });
    
    if (fileHits.length > 0) {
      issues.push({ file: f.replace(ROOT, 'src'), hits: fileHits });
      totalHits += fileHits.length;
    }
  } catch {}
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  فایل‌های با مشکل: ' + issues.length);
console.log('  کل خطوط خراب: ' + totalHits);
console.log('═══════════════════════════════════════════════════════════\n');

for (const issue of issues.slice(0, 20)) {
  console.log('📄 ' + issue.file);
  issue.hits.slice(0, 5).forEach((h) => {
    console.log('   L' + h.line + ': ' + h.text);
  });
  if (issue.hits.length > 5) {
    console.log('   ... و ' + (issue.hits.length - 5) + ' خط دیگر');
  }
  console.log('');
}

if (issues.length > 20) {
  console.log('... و ' + (issues.length - 20) + ' فایل دیگر');
}