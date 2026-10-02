import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
let p = fs.readFileSync(pagePath, 'utf8');

fs.writeFileSync(pagePath + '.bak-modal-fix', p, 'utf8');
console.log('✅ بکاپ');

// 1) حذف مودالی که در جای اشتباه درج شده
const modalRegex = /\s*<AccountPickerModal[\s\S]*?\/>\s*/g;
const matches = p.match(modalRegex);
if (matches) {
  console.log('حذف ' + matches.length + ' مودال از جای اشتباه');
  p = p.replace(modalRegex, '\n');
}

// 2) پیدا کردن محل درست: آخرین `</div>` قبل از `);` که پایان ApprovalsPage است
// anchor مشخص: `      {/* Confirm Reject Modal */}` یا `function ApprovalCard`
const cardFuncIdx = p.indexOf('function ApprovalCard');
if (cardFuncIdx < 0) {
  console.log('❌ ApprovalCard پیدا نشد');
  process.exit(1);
}

// بخش قبل از ApprovalCard
const beforeCard = p.slice(0, cardFuncIdx);

// پیدا کردن آخرین `    </div>\n  );\n}` در beforeCard
const lastClose = beforeCard.lastIndexOf('    </div>\n  );\n}');
const lastCloseCRLF = beforeCard.lastIndexOf('    </div>\r\n  );\r\n}');

let insertIdx = -1;
let nl = '\n';
if (lastCloseCRLF > lastClose) {
  insertIdx = lastCloseCRLF;
  nl = '\r\n';
} else if (lastClose > 0) {
  insertIdx = lastClose;
}

if (insertIdx < 0) {
  console.log('❌ anchor بستن ApprovalsPage پیدا نشد');
  // نمایش ۲۰ خط قبل از ApprovalCard
  const lines = beforeCard.split('\n');
  console.log('\n── ۲۰ خط آخر قبل از function ApprovalCard ──');
  lines.slice(-20).forEach((l, i) => console.log(String(lines.length - 19 + i).padStart(4) + '| ' + l));
  process.exit(1);
}

console.log('anchor پیدا شد در ایندکس ' + insertIdx);

// 3) درج مودال در محل درست
const modalJsx = nl + nl +
'      <AccountPickerModal' + nl +
'        isOpen={!!payingItem}' + nl +
'        amount={Number(payingItem?.amount || 0)}' + nl +
'        pettyAccountName={payingItem?.accountName}' + nl +
'        requestCode={payingItem?.code}' + nl +
'        onClose={() => setPayingItem(null)}' + nl +
'        onConfirm={handlePay}' + nl +
'      />' + nl;

p = beforeCard.slice(0, insertIdx) + modalJsx + beforeCard.slice(insertIdx) + p.slice(cardFuncIdx);

fs.writeFileSync(pagePath, p, 'utf8');
console.log('✅ مودال در محل درست درج شد');

// 4) تأیید
console.log('\n── ۱۵ خط قبل از function ApprovalCard ──');
const newCardFuncIdx = p.indexOf('function ApprovalCard');
const checkLines = p.slice(0, newCardFuncIdx).split('\n');
checkLines.slice(-15).forEach((l, i) => console.log(String(checkLines.length - 14 + i).padStart(4) + '| ' + l));