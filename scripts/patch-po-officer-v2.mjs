import fs from 'node:fs';
const schemaPath = 'E:/EpsayAccounting/backend/prisma/schema.prisma';
let s = fs.readFileSync(schemaPath, 'utf8');

const projOld = '  consultantId String?  @map("consultant_id") @db.Uuid\n  consultant   Partner? @relation("ProjectConsultant", fields: [consultantId], references: [id])';
const projNew = '  consultantId String?  @map("consultant_id") @db.Uuid\n  consultant   Partner? @relation("ProjectConsultant", fields: [consultantId], references: [id])\n\n  purchasingOfficerId String? @map("purchasing_officer_id") @db.Uuid\n  purchasingOfficer   User?   @relation("ProjectPurchasingOfficer", fields: [purchasingOfficerId], references: [id])';

if (!s.includes('purchasingOfficerId') && s.includes(projOld)) {
  s = s.replace(projOld, projNew);
  console.log('OK Project');
} else {
  console.log('SKIP Project');
}

const userOld = '  themePreference             String?                  @map("theme_preference") @db.VarChar(64)';
const userNew = '  themePreference             String?                  @map("theme_preference") @db.VarChar(64)\n\n  purchasingOfficerFor        Project[]                @relation("ProjectPurchasingOfficer")\n  purchaseOrdersAssigned      PurchaseOrder[]          @relation("POAssignedTo")';

if (!s.includes('purchasingOfficerFor') && s.includes(userOld)) {
  s = s.replace(userOld, userNew);
  console.log('OK User');
} else {
  console.log('SKIP User');
}

const poOld = '  status POStatus @default(DRAFT)\n  notes  String?  @db.VarChar(500)';
const poNew = '  status POStatus @default(DRAFT)\n  notes  String?  @db.VarChar(500)\n\n  assignedToId String?   @map("assigned_to_id") @db.Uuid\n  assignedTo   User?     @relation("POAssignedTo", fields: [assignedToId], references: [id])\n  assignedAt   DateTime? @map("assigned_at")';

if (!s.includes('assignedToId') && s.includes(poOld)) {
  s = s.replace(poOld, poNew);
  console.log('OK PurchaseOrder');
} else {
  console.log('SKIP PurchaseOrder');
}

fs.writeFileSync(schemaPath, s, 'utf8');
console.log('=== DONE ===');