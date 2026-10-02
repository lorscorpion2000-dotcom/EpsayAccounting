import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const schema = fs.readFileSync(ROOT + '/backend/prisma/schema.prisma', 'utf8');
const svc = fs.readFileSync(ROOT + '/backend/src/modules/petty-cash/requests.service.ts', 'utf8');
const ctrl = fs.readFileSync(ROOT + '/backend/src/modules/petty-cash/requests.controller.ts', 'utf8');

console.log('═════════ 1) PettyCashAccount ═════════');
const pcM = schema.match(/model PettyCashAccount \{[\s\S]*?\n\}/);
if (pcM) pcM[0].split('\n').forEach((l) => {
  if (/accountId|account\s+Account|holderId/.test(l)) console.log('  ' + l.trim());
});

console.log('\n═════════ 2) PettyCashTransaction ═════════');
const txM = schema.match(/model PettyCashTransaction \{[\s\S]*?\n\}/);
if (txM) txM[0].split('\n').forEach((l) => {
  if (/journalEntry/.test(l)) console.log('  ' + l.trim());
  else if (!/^\s*$/.test(l) && l.includes('journalEntry')) console.log('  ' + l.trim());
});

console.log('\n═════════ 3) Account reverse ═════════');
const aM = schema.match(/model Account \{[\s\S]*?\n\}/);
if (aM) aM[0].split('\n').forEach((l) => {
  if (/pettyCash|PettyCash/.test(l)) console.log('  ' + l.trim());
});

console.log('\n═════════ 4) JournalEntry reverse ═════════');
const jeM = schema.match(/model JournalEntry \{[\s\S]*?\n\}/);
if (jeM) jeM[0].split('\n').forEach((l) => {
  if (/pettyCash|PettyCash/.test(l)) console.log('  ' + l.trim());
});

console.log('\n═════════ 5) markPaid signature ═════════');
const mp = svc.match(/async markPaid\([^)]*\)/);
if (mp) console.log('  ' + mp[0]);

console.log('\n═════════ 6) pay endpoint ═════════');
const pe = ctrl.match(/@Patch\(':id\/pay'\)[\s\S]{0,300}/);
if (pe) console.log(pe[0]);