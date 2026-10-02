import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
const c = fs.readFileSync(f, 'utf8');

const checks = [
  { name: 'import useAuthStore', regex: 'useAuthStore' },
  { name: 'TAB_ROLES', regex: 'TAB_ROLES' },
  { name: 'canSeeTab', regex: 'canSeeTab' },
  { name: 'userRoles', regex: 'userRoles' },
  { name: 'فیلتر تب all', regex: "canSeeTab\\(['\"]all['\"]" },
  { name: 'فیلتر تب pettyCashRequests', regex: "canSeeTab\\(['\"]pettyCashRequests['\"]" },
  { name: 'فیلتر تب purchaseOrders', regex: "canSeeTab\\(['\"]purchaseOrders['\"]" },
  { name: 'انتخاب خودکار تب', regex: 'autoSelectTab' },
  { name: 'عنوان کارتابل من', regex: 'کارتابل من' },
];

console.log('═══════ ApprovalsPage.tsx ═══════\n');
checks.forEach((c) => {
  const found = new RegExp(c.regex).test(fs.readFileSync(ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx', 'utf8'));
  console.log((found ? '✅' : '❌') + ' ' + c.name);
});

console.log('\nحجم فایل: ' + c.length);