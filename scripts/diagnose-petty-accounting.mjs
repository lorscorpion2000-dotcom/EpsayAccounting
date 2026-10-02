import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const schema = fs.readFileSync(ROOT + '/backend/prisma/schema.prisma', 'utf8');

// 1) PettyCashAccount — آیا accountId دارد
console.log('═══ PettyCashAccount ═══');
const pcMatch = schema.match(/model PettyCashAccount \{[\s\S]*?\n\}/);
if (pcMatch) {
  pcMatch[0].split('\n').forEach((l) => {
    if (/accountId|account|code|name|holder/.test(l)) {
      console.log('  ' + l.trim());
    }
  });
}

// 2) AccountMapping
console.log('\n═══ AccountMapping ═══');
const amMatch = schema.match(/model AccountMapping \{[\s\S]*?\n\}/);
if (amMatch) console.log(amMatch[0]);
else console.log('  ❌ پیدا نشد');

// 3) PettyCashTransaction
console.log('\n═══ PettyCashTransaction ═══');
const txMatch = schema.match(/model PettyCashTransaction \{[\s\S]*?\n\}/);
if (txMatch) console.log(txMatch[0]);

// 4) چطور سند دوبل ساخته میشود (نمونه از petty-cash transactions)
const svc = ROOT + '/backend/src/modules/petty-cash/transactions.service.ts';
if (fs.existsSync(svc)) {
  const c = fs.readFileSync(svc, 'utf8');
  console.log('\n═══ transactions.service.ts — جستجوی journal ═══');
  c.split('\n').forEach((l, i) => {
    if (/journal|Journal|accountId|AccountMapping/.test(l)) {
      console.log('L' + (i + 1) + ': ' + l.trim().substring(0, 90));
    }
  });
}