import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/accounting/pages/JournalFormPage.tsx';

if (!fs.existsSync(f)) { console.log('X فایل نیست'); process.exit(1); }
const c = fs.readFileSync(f, 'utf8');

console.log('═══ JournalFormPage.tsx ═══');
console.log('حجم: ' + c.length + ' کاراکتر');
console.log('');

// 1) چک متدهای موجود
console.log('── API methods ──');
console.log((c.includes('accounts.flat') ? '✅' : '❌') + ' accounts.flat');
console.log((c.includes('accounts.postable') ? '✅' : '❌') + ' accounts.postable');
console.log((c.includes('accounts.tree') ? '✅' : '❌') + ' accounts.tree');
console.log((c.includes('accountId') ? '✅' : '❌') + ' accountId در form');
console.log('');

// 2) نمایش ساختار — ۳۰ خط اول
console.log('── خطوط ۱-۳۰ ──');
c.split('\n').slice(0, 30).forEach((l, i) => {
  console.log(String(i + 1).padStart(3) + '| ' + l.substring(0, 100));
});

console.log('');
console.log('── خطوط مرتبط با account select ──');
c.split('\n').forEach((l, i) => {
  if (/accountId|accounts\.map|<select|ACCOUNT_LEVEL/.test(l)) {
    console.log('L' + (i + 1) + ': ' + l.trim().substring(0, 100));
  }
});