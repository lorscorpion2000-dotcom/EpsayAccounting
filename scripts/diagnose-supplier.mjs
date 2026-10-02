import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const schemaPath = ROOT + '/backend/prisma/schema.prisma';

// 1) چک schema
const schema = fs.readFileSync(schemaPath, 'utf8');
const poBlock = schema.match(/model PurchaseOrder \{[\s\S]*?\n\}/);

console.log('═══ PurchaseOrder در schema ═══\n');
if (poBlock) {
  poBlock[0].split('\n').forEach((l) => {
    if (/supplierId|supplier\s+Partner/.test(l)) {
      console.log('  ' + l.trim());
    }
  });
} else {
  console.log('❌ PurchaseOrder پیدا نشد');
}

// 2) چک Prisma Client فعلی
const clientPath = ROOT + '/backend/node_modules/.prisma/client/index.d.ts';
if (fs.existsSync(clientPath)) {
  const pc = fs.readFileSync(clientPath, 'utf8');
  // پیدا کردن PurchaseOrderUncheckedCreateInput یا مشابه
  const match = pc.match(/supplierId:\s*(string\??)\s*\n/);
  console.log('\n═══ Prisma Client ═══');
  console.log('  supplierId type: ' + (match ? match[1] : 'not found'));
}

// 3) اگر لازم است، schema را اصلاح کن
let changed = false;
if (poBlock) {
  const block = poBlock[0];
  // حالت 1: String (غیر nullable)
  if (/supplierId String\s+@map\("supplier_id"\)/.test(block) && !/supplierId String\?/.test(block)) {
    const fixed = block
      .replace(
        /supplierId String\s+@map\("supplier_id"\) @db\.Uuid/,
        'supplierId String? @map("supplier_id") @db.Uuid'
      )
      .replace(
        /supplier\s+Partner\s+@relation\(fields:\s*\[supplierId\]/,
        'supplier   Partner? @relation(fields: [supplierId]'
      );
    
    if (fixed !== block) {
      const newSchema = schema.replace(block, fixed);
      fs.writeFileSync(schemaPath, newSchema, 'utf8');
      changed = true;
      console.log('\n✅ schema اصلاح شد (supplierId → nullable)');
    }
  } else {
    console.log('\n✅ schema از قبل nullable است');
  }
}

if (!changed) {
  console.log('\nℹ schema دست‌نخورده ماند');
}