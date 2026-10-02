import fs from 'node:fs';

const ROOT = 'E:/EpsayAccounting/';

const files = [
  'frontend/src/modules/accounting/pages/JournalBookPage.tsx',
  'frontend/src/modules/accounting/pages/JournalFormPage.tsx',
  'frontend/src/modules/accounting/pages/JournalViewPage.tsx',
  'frontend/src/modules/accounting/pages/LedgerPage.tsx',
  'frontend/src/modules/accounting/pages/PartyLedgerPage.tsx',
  'frontend/src/modules/accounting/pages/ProjectLedgerPage.tsx',
  'frontend/src/modules/accounting/pages/TrialBalancePage.tsx',
  'frontend/src/modules/settings/pages/RolesPage.tsx',
  'frontend/src/modules/settings/pages/UsersPage.tsx',
];

console.log('═══════════════════════════════════════════════════════════');
console.log('  بازیابی — حذف ی درجشده بین هر کاراکتر');
console.log('═══════════════════════════════════════════════════════════\n');

let recovered = 0;
let failed = 0;

for (const rel of files) {
  const full = ROOT + rel;
  if (!fs.existsSync(full)) { console.log('⚠ ' + rel); continue; }
  
  const content = fs.readFileSync(full, 'utf8');
  const name = rel.split('/').pop();
  
  // چک: آیا الگوی خراب دارد (ی بعد از کاراکتر اول)
  if (!content.startsWith('i\u06CC') && !content.startsWith('/\u06CC') && !content.startsWith('c\u06CC')) {
    console.log('ℹ ' + name + ' — الگو مطابقت ندارد');
    continue;
  }
  
  // بازیابی: گرفتن ایندکسهای زوج
  let fixed = '';
  for (let i = 0; i < content.length; i += 2) {
    fixed += content[i];
  }
  
  // تست: حذف ی عربی (U+064A) و ک عربی (U+0643) که از اسکریپت spelling مانده
  fixed = fixed.replace(/\u064A/g, '\u06CC');  // Arabic Yeh → Persian Yeh
  fixed = fixed.replace(/\u0643/g, '\u06A9');  // Arabic Kaf → Persian Kaf
  
  // بررسی صحت
  const trimmed = fixed.trimStart();
  if (trimmed.startsWith('import') || trimmed.startsWith('interface') || trimmed.startsWith('/**')) {
    fs.copyFileSync(full, full + '.corrupt-bak');
    fs.writeFileSync(full, fixed, 'utf8');
    console.log('✅ ' + name + ' — بازیابی شد (' + content.length + '→' + fixed.length + ' chars)');
    recovered++;
  } else {
    console.log('❌ ' + name + ' — ناموفق');
    console.log('   first 80: ' + fixed.slice(0, 80));
    failed++;
  }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  ✅ بازیابیشده: ' + recovered);
console.log('  ❌ ناموفق: ' + failed);
console.log('═══════════════════════════════════════════════════════════');