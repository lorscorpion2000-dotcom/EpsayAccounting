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
    else if (f.endsWith('.ts') && !f.includes('.bak')) files.push(full);
  }
}
walk(SRC);

console.log('═══ آنالیز تاریخ/ساعت در Backend ═══\n');

const issues = {
  newDate: [],
  toISOString: [],
  toLocaleDateString: [],
  jalaliFn: [],
  setHours: [],
  dateMath: [],
  utcProblem: [],
};

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = f.replace(__dirname, '').replace(/^[\\\/]/, '');
  const lines = src.split(/\r?\n/);

  lines.forEach((l, i) => {
    const ln = i + 1;

    // new Date() بدون آرگومان
    if (/new Date\(\)/.test(l) && !/Date\.now/.test(l)) {
      issues.newDate.push({ file: rel, line: ln, text: l.trim() });
    }

    // toISOString().slice(0, 10)
    if (/toISOString\(\)\.slice\(0,\s*10\)/.test(l)) {
      issues.toISOString.push({ file: rel, line: ln, text: l.trim() });
    }

    // toLocaleDateString/TimeString
    if (/toLocaleDateString|toLocaleTimeString|toLocaleString/.test(l)) {
      issues.toLocaleDateString.push({ file: rel, line: ln, text: l.trim() });
    }

    // توابع jalali
    if (/jalaali|jalali|persian.?date/i.test(l)) {
      issues.jalaliFn.push({ file: rel, line: ln });
    }

    // setHours
    if (/setHours|setMinutes|setSeconds/.test(l)) {
      issues.setHours.push({ file: rel, line: ln, text: l.trim() });
    }

    // new Date(dateString) که ممکنه UTC issue داشته باشه
    if (/new Date\([a-zA-Z_]\w*\)/.test(l) && !/new Date\(dto\./.test(l)) {
      issues.dateMath.push({ file: rel, line: ln, text: l.trim() });
    }

    // ساعت ثابت مثل T00:00:00 یا T23:59:59
    if (/T\d{2}:\d{2}:\d{2}/.test(l)) {
      issues.utcProblem.push({ file: rel, line: ln, text: l.trim() });
    }
  });
}

console.log(`1. new Date() بدون آرگومان: ${issues.newDate.length}`);
const uniq1 = [...new Set(issues.newDate.map(x => x.file))];
console.log(`   در ${uniq1.length} فایل مختلف`);
for (const x of issues.newDate.slice(0, 20)) {
  console.log(`   ⚠️  ${x.file}:${x.line}`);
  console.log(`       ${x.text.slice(0, 130)}`);
}
if (issues.newDate.length > 20) console.log(`   ... +${issues.newDate.length - 20} مورد دیگر`);

console.log(`\n2. toISOString().slice(0,10): ${issues.toISOString.length}`);
for (const x of issues.toISOString.slice(0, 15)) {
  console.log(`   ${x.file}:${x.line}`);
  console.log(`      ${x.text.slice(0, 130)}`);
}

console.log(`\n3. toLocaleDateString/TimeString: ${issues.toLocaleDateString.length}`);
for (const x of issues.toLocaleDateString) {
  console.log(`   ⚠️  ${x.file}:${x.line}`);
  console.log(`       ${x.text.slice(0, 130)}`);
}

console.log(`\n4. توابع jalali موجود: ${issues.jalaliFn.length}`);

console.log(`\n5. setHours/setMinutes: ${issues.setHours.length}`);
for (const x of issues.setHours.slice(0, 10)) {
  console.log(`   ${x.file}:${x.line}`);
  console.log(`      ${x.text.slice(0, 130)}`);
}

console.log(`\n6. new Date(dateString) - ریسک UTC: ${issues.dateMath.length}`);
for (const x of issues.dateMath.slice(0, 20)) {
  console.log(`   ${x.file}:${x.line}`);
  console.log(`      ${x.text.slice(0, 130)}`);
}

console.log(`\n7. T00:00:00 / T23:59:59 ثابت: ${issues.utcProblem.length}`);
for (const x of issues.utcProblem.slice(0, 15)) {
  console.log(`   ${x.file}:${x.line}`);
  console.log(`      ${x.text.slice(0, 130)}`);
}

console.log('\n═══ خلاصه ═══');
console.log(`   کل فایل‌های بررسی‌شده: ${files.length}`);
console.log(`   فایل‌های با jalali: ${uniq1.length}`);