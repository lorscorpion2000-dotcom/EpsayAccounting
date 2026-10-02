import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const svcPath = ROOT + '/backend/src/modules/accounting/accounts.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');
let changed = 0;

// پچ update — با anchor دقیق
if (!svc.includes("dto.detailType !== undefined")) {
  const match = svc.match(/(async update\([^)]+\)[\s\S]*?const data: any = \{\};)/);
  if (match) {
    svc = svc.replace(
      match[1],
      match[1] + `
    if ((dto as any).detailType !== undefined) data.detailType = (dto as any).detailType || null;
    if ((dto as any).detailId !== undefined) data.detailId = (dto as any).detailId || null;`
    );
    changed++;
    console.log('✅ update: detailType/detailId اضافه شد');
  } else {
    console.log('!! anchor update پیدا نشد');
  }
} else {
  console.log('ℹ update از قبل پچ شده');
}

if (changed) {
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('✅ ذخیره شد');
}

// تأیید نهایی
console.log('');
console.log('── تأیید ──');
const fresh = fs.readFileSync(svcPath, 'utf8');
console.log((fresh.includes("dto.detailType !== undefined") ? '✅' : '❌') + ' update');
console.log((fresh.includes('detailType: (dto as any).detailType') ? '✅' : '❌') + ' create');