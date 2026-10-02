import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Backend: getPending — شامل PENDING + APPROVED
// ═══════════════════════════════════════════════════════════════
const svcPath = ROOT + '/backend/src/modules/approvals/approvals.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');
let svcChanged = 0;

if (svc.includes("pettyCashRequest.findMany({\n        where: { status: 'PENDING' },")) {
  svc = svc.replace(
    "pettyCashRequest.findMany({\n        where: { status: 'PENDING' },",
    "pettyCashRequest.findMany({\n        where: { status: { in: ['PENDING', 'APPROVED'] } },"
  );
  svcChanged++;
  console.log('✅ getPending: شامل APPROVED هم شد');
} else if (svc.includes("pettyCashRequest.findMany({\r\n        where: { status: 'PENDING' },")) {
  svc = svc.replace(
    "pettyCashRequest.findMany({\r\n        where: { status: 'PENDING' },",
    "pettyCashRequest.findMany({\r\n        where: { status: { in: ['PENDING', 'APPROVED'] } },"
  );
  svcChanged++;
  console.log('✅ getPending: شامل APPROVED هم شد (CRLF)');
} else {
  console.log('ℹ getPending — از قبل تنظیم شده یا anchor نبود');
}

if (svcChanged) {
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('✅ approvals.service.ts ذخیره شد');
}

// ═══════════════════════════════════════════════════════════════
// 2) Frontend API — افزودن متد pettyCashPay
// ═══════════════════════════════════════════════════════════════
const apiPath = ROOT + '/frontend/src/modules/approvals/services/approvals.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');
let apiChanged = 0;

if (!api.includes('pettyCashPay')) {
  // افزودن متد به approvalsApi
  api = api.replace(
    /(reject:\s*async[\s\S]*?return data;\s*\},)/,
    `$1
  pettyCashPay: async (id: string) => {
    const { data } = await api.post('/petty-cash/requests/' + id + '/pay');
    return data;
  },`
  );
  apiChanged++;
  console.log('✅ approvals.api.ts — متد pettyCashPay');
}

if (apiChanged) {
  fs.writeFileSync(apiPath, api, 'utf8');
}

// ═══════════════════════════════════════════════════════════════
// 3) Frontend: ApprovalsPage — دکمه پرداخت برای CASH_RQ با status=APPROVED
// ═══════════════════════════════════════════════════════════════
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
let p = fs.readFileSync(pagePath, 'utf8');
let pChanged = 0;

// بکاپ
fs.writeFileSync(pagePath + '.bak-pay', p, 'utf8');

// افزودن import Wallet
if (!p.includes('Wallet')) {
  p = p.replace(
    /import \{([^}]*)\} from 'lucide-react';/,
    (m, imps) => {
      const items = imps.split(',').map((s) => s.trim()).filter(Boolean);
      if (!items.includes('Wallet')) items.push('Wallet');
      return 'import { ' + items.join(', ') + " } from 'lucide-react';";
    }
  );
  pChanged++;
  console.log('✅ import Wallet');
}

// افزودن handler handlePay
if (!p.includes('handlePay')) {
  // پیدا کردن handleReject یا handleApprove
  const anchor = /const handleApprove = async[\s\S]*?\n  \};/;
  const match = p.match(anchor);
  if (match) {
    const payHandler = `
  const handlePay = async (id: string, module: string) => {
    if (module !== 'petty-cash-request') return;
    setActionLoading(true);
    try {
      await approvalsApi.pettyCashPay(id);
      toast.success('تنخواه با موفقیت شار شد');
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };
`;
    p = p.replace(match[0], match[0] + payHandler);
    pChanged++;
    console.log('✅ handlePay اضافه شد');
  }
}

// افزودن دکمه پرداخت در ردیفهای petty-cash-request با status=APPROVED
if (!p.includes('approvalsApi.pettyCashPay')) {
  console.log('ℹ handlePay هست ولی دکمه اضافه نشده');
}

if (pChanged) {
  fs.writeFileSync(pagePath, p, 'utf8');
  console.log('✅ ApprovalsPage.tsx ذخیره شد');
}

console.log('');
console.log('=== DONE ===');