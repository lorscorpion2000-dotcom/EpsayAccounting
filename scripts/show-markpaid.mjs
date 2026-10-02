import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const svc = fs.readFileSync(ROOT + '/backend/src/modules/petty-cash/requests.service.ts', 'utf8');
const m = svc.match(/async markPaid\([^)]*\)[\s\S]*?\n  \}/);
if (m) {
  console.log(m[0]);
} else {
  console.log('❌ markPaid پیدا نشد');
}