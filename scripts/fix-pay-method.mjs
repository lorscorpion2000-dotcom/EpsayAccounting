import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const apiPath = ROOT + '/frontend/src/modules/approvals/services/approvals.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');

if (api.includes("api.post('/petty-cash/requests/' + id + '/pay')")) {
  api = api.replace(
    "api.post('/petty-cash/requests/' + id + '/pay')",
    "api.patch('/petty-cash/requests/' + id + '/pay')"
  );
  fs.writeFileSync(apiPath, api, 'utf8');
  console.log('✅ POST → PATCH اصلاح شد');
} else if (api.includes("api.patch('/petty-cash/requests/")) {
  console.log('ℹ از قبل PATCH است');
} else {
  console.log('❌ متد پیدا نشد');
  console.log(api.split('\n').filter((l) => l.includes('pettyCash')).join('\n'));
}