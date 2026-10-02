import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// 1) approvals.service.ts — approve method
const apprSvc = ROOT + '/backend/src/modules/approvals/approvals.service.ts';
if (fs.existsSync(apprSvc)) {
  const c = fs.readFileSync(apprSvc, 'utf8');
  console.log('═══ approvals.service.ts — approve method ═══\n');
  const m = c.match(/async approve\([\s\S]{0,2500}?\n  \}/);
  if (m) console.log(m[0]);
}

// 2) pr.service.ts — create method (ساختار PR)
const prSvc = ROOT + '/backend/src/modules/procurement/pr.service.ts';
if (fs.existsSync(prSvc)) {
  const c = fs.readFileSync(prSvc, 'utf8');
  console.log('\n═══ pr.service.ts — متدها ═══\n');
  c.split('\n').forEach((l, i) => {
    if (/async \w+/.test(l)) console.log('L' + (i + 1) + ': ' + l.trim());
  });
}

// 3) po.service.ts — create method
const poSvc = ROOT + '/backend/src/modules/procurement/po.service.ts';
if (fs.existsSync(poSvc)) {
  const c = fs.readFileSync(poSvc, 'utf8');
  console.log('\n═══ po.service.ts — create method ═══\n');
  const m = c.match(/async create\([\s\S]{0,1500}?\n  \}/);
  if (m) console.log(m[0]);
}