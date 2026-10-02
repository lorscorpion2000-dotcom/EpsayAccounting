import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const files = [
  '/frontend/src/modules/accounting/pages/PartyLedgerPage.tsx',
  '/frontend/src/modules/accounting/pages/ProjectLedgerPage.tsx',
  '/frontend/src/modules/accounting/pages/ARAgingPage.tsx',
  '/frontend/src/modules/accounting/pages/APAgingPage.tsx',
  '/frontend/src/modules/accounting/pages/ProfitLossPage.tsx',
  '/frontend/src/modules/accounting/pages/BalanceSheetPage.tsx',
  '/frontend/src/modules/accounting/pages/DetailedTrialBalancePage.tsx',
];

// فقط جایگزینی در متنهای فارسی (نه کد انگلیسی)
const fixes = [
  // متنهای فارسی داخل quotes
  ['هزینهها', 'هزینه\u200Cها'],
  ['هزینهها', 'هزینه\u200Cها'],
  ['هزینههای', 'هزینه\u200Cهای'],
  ['هزینههای', 'هزینه\u200Cهای'],
  ['درآمدها', 'درآمد\u200Cها'],
  ['درآمدهای', 'درآمد\u200Cهای'],
  ['بدهیها', 'بدهی\u200Cها'],
  ['بدهیهای', 'بدهی\u200Cهای'],
  ['داراییها', 'دارایی\u200Cها'],
  ['داراییهای', 'دارایی\u200Cهای'],
  ['حسابها', 'حساب\u200Cها'],
  ['حسابهای', 'حساب\u200Cهای'],
  ['طرف حسابها', 'طرف\u200Cحساب\u200Cها'],
  ['صورتوضعیت', 'صورت\u200Cوضعیت'],
  ['بهروزرسانی', 'به\u200Cروزرسانی'],
  ['به روزرسانی', 'به\u200Cروزرسانی'],
  ['بستانکارها', 'بستانکاران'],
  ['بدهکارها', 'بدهکاران'],
  ['کردهاید', 'کرده\u200Cاید'],
];

let totalFixed = 0;

for (const rel of files) {
  const f = ROOT + rel;
  if (!fs.existsSync(f)) { console.log('!! ' + rel); continue; }
  
  let c = fs.readFileSync(f, 'utf8');
  const original = c;
  let count = 0;
  
  for (const [from, to] of fixes) {
    if (c.includes(from)) {
      const before = c;
      c = c.split(from).join(to);
      if (c !== before) count++;
    }
  }
  
  if (c !== original) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('OK ' + rel.split('/').pop() + ' (' + count + ' جایگزینی)');
    totalFixed++;
  } else {
    console.log('SKIP ' + rel.split('/').pop());
  }
}

console.log('');
console.log('فایلهای اصلاحشده: ' + totalFixed);