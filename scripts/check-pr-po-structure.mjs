import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// 1) po.service.ts — create method
const poSvc = ROOT + '/backend/src/modules/procurement/po.service.ts';
if (fs.existsSync(poSvc)) {
  const c = fs.readFileSync(poSvc, 'utf8');
  console.log('═══ po.service.ts — create method ═══\n');
  const m = c.match(/async create\([\s\S]{0,2000}?\n  \}/);
  if (m) console.log(m[0]);
}

// 2) PR schema
const schema = fs.readFileSync(ROOT + '/backend/prisma/schema.prisma', 'utf8');
console.log('\n═══ PurchaseRequest Model ═══\n');
const prMatch = schema.match(/model PurchaseRequest \{[\s\S]*?\n\}/);
if (prMatch) console.log(prMatch[0]);

console.log('\n═══ PurchaseRequestItem Model ═══\n');
const priMatch = schema.match(/model PurchaseRequestItem \{[\s\S]*?\n\}/);
if (priMatch) console.log(priMatch[0]);

console.log('\n═══ PurchaseOrder Model ═══\n');
const poMatch = schema.match(/model PurchaseOrder \{[\s\S]*?\n\}/);
if (poMatch) console.log(poMatch[0]);

console.log('\n═══ PurchaseOrderItem Model ═══\n');
const poiMatch = schema.match(/model PurchaseOrderItem \{[\s\S]*?\n\}/);
if (poiMatch) console.log(poiMatch[0]);

// 3) PR Status enum
console.log('\n═══ PRStatus / POStatus enums ═══\n');
const enumMatch = schema.match(/enum PRStatus \{[\s\S]*?\n\}/);
if (enumMatch) console.log(enumMatch[0]);
const poEnumMatch = schema.match(/enum POStatus \{[\s\S]*?\n\}/);
if (poEnumMatch) console.log(poEnumMatch[0]);