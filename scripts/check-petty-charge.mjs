import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// 1) PettyCashRequest schema
const schema = fs.readFileSync(ROOT + '/backend/prisma/schema.prisma', 'utf8');
console.log('═══ PettyCashRequest Model ═══\n');
const prMatch = schema.match(/model PettyCashRequest \{[\s\S]*?\n\}/);
if (prMatch) console.log(prMatch[0]);

// 2) PettyCashTxType enum
console.log('\n═══ PettyCashTxType enum ═══\n');
const txMatch = schema.match(/enum PettyCashTxType \{[\s\S]*?\n\}/);
if (txMatch) console.log(txMatch[0]);

console.log('\n═══ PettyCashRequestStatus enum ═══\n');
const stMatch = schema.match(/enum PettyCashRequestStatus \{[\s\S]*?\n\}/);
if (stMatch) console.log(stMatch[0]);

// 3) petty-cash requests service متدها
const svc = ROOT + '/backend/src/modules/petty-cash/requests.service.ts';
if (fs.existsSync(svc)) {
  const c = fs.readFileSync(svc, 'utf8');
  console.log('\n═══ requests.service.ts — متدها ═══\n');
  c.split('\n').forEach((l, i) => {
    if (/async \w+/.test(l)) console.log('L' + (i + 1) + ': ' + l.trim());
  });
}

// 4) petty-cash requests controller endpoints
const ctrl = ROOT + '/backend/src/modules/petty-cash/requests.controller.ts';
if (fs.existsSync(ctrl)) {
  const c = fs.readFileSync(ctrl, 'utf8');
  console.log('\n═══ requests.controller.ts — endpoints ═══\n');
  c.split('\n').forEach((l, i) => {
    if (/@(Get|Post|Patch|Delete)/.test(l)) console.log('L' + (i + 1) + ': ' + l.trim());
  });
}