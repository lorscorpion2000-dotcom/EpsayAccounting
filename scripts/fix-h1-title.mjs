import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
let p = fs.readFileSync(pagePath, 'utf8');

fs.writeFileSync(pagePath + '.bak-h1', p, 'utf8');
console.log('✅ بکاپ');

// نمایش خطوط ۲۰۰-۲۲۰
const lines = p.split('\n');
console.log('\n── خطوط ۲۰۰-۲۲۰ ──');
for (let i = 199; i < 220 && i < lines.length; i++) {
  console.log(String(i + 1).padStart(4) + '| ' + lines[i]);
}

// پیدا کردن رشته دقیق «کارتابل تاییدها» و جایگزینی
const target = 'کارتابل تاییدها';
const replacement = '{userRoles.includes(\'admin\') || userRoles.includes(\'super_admin\') ? \'کارتابل مدیران\' : \'کارتابل من\'}';

if (p.includes(target)) {
  // چک کن از قبل جایگزین نشده
  if (p.includes('کارتابل مدیران')) {
    console.log('\nℹ از قبل هست');
  } else {
    p = p.replace(target, replacement);
    fs.writeFileSync(pagePath, p, 'utf8');
    console.log('\n✅ «کارتابل تاییدها» → با شرط نقش');
  }
} else if (p.includes('کارتابل تأییدها')) {
  p = p.replace('کارتابل تأییدها', replacement);
  fs.writeFileSync(pagePath, p, 'utf8');
  console.log('\n✅ «کارتابل تأییدها» → با شرط نقش');
} else {
  console.log('\n❌ متن «کارتابل...» پیدا نشد');
  // دنبال "کارتابل" بگرد
  const kMatches = [...p.matchAll(/کارتابل[\u0600-\u06FF\s]*/g)];
  console.log('موارد پیدا شده:');
  kMatches.slice(0, 5).forEach((m) => console.log('  «' + m[0] + '»'));
}