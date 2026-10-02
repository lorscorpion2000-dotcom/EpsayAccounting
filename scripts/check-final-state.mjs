import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

console.log('═══ Frontend Status ═══\n');

// 1) AccountPickerModal
const modalPath = ROOT + '/frontend/src/modules/petty-cash/components/AccountPickerModal.tsx';
console.log((fs.existsSync(modalPath) ? '✅' : '❌') + ' AccountPickerModal.tsx');

// 2) ApprovalsPage — چک جزئیات
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
const page = fs.readFileSync(pagePath, 'utf8');
console.log((page.includes('AccountPickerModal') ? '✅' : '❌') + ' import AccountPickerModal');
console.log((page.includes('payingItem') ? '✅' : '❌') + ' state payingItem');
console.log((page.includes('setPayingItem(item)') ? '✅' : '❌') + ' onPay → setPayingItem');
console.log((page.includes('onConfirm={handlePay}') ? '✅' : '❌') + ' onConfirm={handlePay}');
console.log((page.includes('<AccountPickerModal') ? '✅' : '❌') + ' JSX <AccountPickerModal');

// 3) approvals.api pettyCashPay
const apiPath = ROOT + '/frontend/src/modules/approvals/services/approvals.api.ts';
const api = fs.readFileSync(apiPath, 'utf8');
console.log((api.includes('sourceAccountId') ? '✅' : '❌') + ' pettyCashPay با sourceAccountId');

// نمایش مکانهای modal
const modalMatches = [...page.matchAll(/<AccountPickerModal/g)];
console.log('\n📍 محلهای <AccountPickerModal: ' + modalMatches.length + ' مورد');
modalMatches.forEach((m, i) => {
  const before = page.slice(0, m.index);
  const lineNum = (before.match(/\n/g) || []).length + 1;
  console.log('  ' + (i + 1) + ') خط ' + lineNum);
});

// نمایش context
if (modalMatches.length > 0) {
  const idx = modalMatches[0].index;
  console.log('\n── Context ──');
  console.log(page.slice(idx - 100, idx + 400));
}