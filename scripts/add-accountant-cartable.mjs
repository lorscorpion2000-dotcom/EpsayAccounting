import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Backend: approvals.service.getPending — شامل APPROVED PR ها
// ═══════════════════════════════════════════════════════════════
const apprSvcPath = ROOT + '/backend/src/modules/approvals/approvals.service.ts';
let svc = fs.readFileSync(apprSvcPath, 'utf8');
let svcChanged = 0;

// چک کنیم آیا از قبل APPROVED می\u200Cگیرد
if (!svc.includes("status: 'APPROVED'") && !svc.includes('status: { in:')) {
  // در pettyCashRequests query — به\u200Cجای PENDING APPROVED هم بگیر
  const oldQuery = /pettyCashRequests:\s*await this\.prisma\.pettyCashRequest\.findMany\(\{[\s\S]*?where:\s*\{[^}]*status:\s*['"]PENDING['"][\s\S]*?\}\)/;
  const match = svc.match(oldQuery);
  if (match) {
    const newQuery = match[0].replace(
      "status: 'PENDING'",
      "status: { in: ['PENDING', 'APPROVED'] }"
    );
    svc = svc.replace(match[0], newQuery);
    svcChanged++;
    console.log('✅ getPending: شامل APPROVED هم شد');
  }
}

if (svcChanged) {
  fs.writeFileSync(apprSvcPath, svc, 'utf8');
  console.log('✅ approvals.service.ts ذخیره شد');
} else {
  console.log('ℹ getPending — تغییری لازم نبود');
}

// ═══════════════════════════════════════════════════════════════
// 2) Frontend: ApprovalsPage — افزودن دکمه «پرداخت» برای CASH_RQ با status=APPROVED
// ═══════════════════════════════════════════════════════════════
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
if (fs.existsSync(pagePath)) {
  let p = fs.readFileSync(pagePath, 'utf8');
  let pChanged = 0;
  
  // چک کنیم approval API متد pay دارد
  const apiPath = ROOT + '/frontend/src/modules/approvals/services/approvals.api.ts';
  if (fs.existsSync(apiPath)) {
    let api = fs.readFileSync(apiPath, 'utf8');
    if (!api.includes('pettyPay')) {
      // افزودن متد به approvalsApi
      api = api.replace(
        /(reject:\s*async[\s\S]*?\},)/,
        `$1
  pettyCashPay: async (id: string) => {
    const { data } = await api.post('/petty-cash/requests/' + id + '/pay');
    return data;
  },`
      );
      fs.writeFileSync(apiPath, api, 'utf8');
      console.log('✅ approvals.api.ts — متد pettyCashPay اضافه شد');
    }
  }
  
  // نمایش دکمه پرداخت در UI — چک کنیم دکمههای action موجود است
  if (!p.includes('Wallet') && p.includes('CheckCircle2')) {
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
  
  if (pChanged) {
    fs.writeFileSync(pagePath, p, 'utf8');
    console.log('✅ ApprovalsPage.tsx — ' + pChanged + ' تغییر');
  }
}

console.log('');
console.log('=== DONE ===');