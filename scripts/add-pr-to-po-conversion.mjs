import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Schema — make supplierId nullable
// ═══════════════════════════════════════════════════════════════
const schemaPath = ROOT + '/backend/prisma/schema.prisma';
let s = fs.readFileSync(schemaPath, 'utf8');
let schemaChanged = false;

if (/supplierId String\s+@map\("supplier_id"\) @db\.Uuid/.test(s)) {
  s = s.replace(
    'supplierId String  @map("supplier_id") @db.Uuid\r\n  supplier   Partner @relation(fields: [supplierId], references: [id])',
    'supplierId String?  @map("supplier_id") @db.Uuid\r\n  supplier   Partner? @relation(fields: [supplierId], references: [id])'
  );
  // اگر CRLF نبود
  s = s.replace(
    'supplierId String  @map("supplier_id") @db.Uuid\n  supplier   Partner @relation(fields: [supplierId], references: [id])',
    'supplierId String?  @map("supplier_id") @db.Uuid\n  supplier   Partner? @relation(fields: [supplierId], references: [id])'
  );
  schemaChanged = true;
  console.log('✅ schema: supplierId nullable');
} else if (/supplierId String\?\s+@map\("supplier_id"\)/.test(s)) {
  console.log('ℹ supplierId از قبل nullable');
} else {
  console.log('❌ supplierId پیدا نشد');
}

if (schemaChanged) {
  fs.writeFileSync(schemaPath, s, 'utf8');
}

// ═══════════════════════════════════════════════════════════════
// 2) approvals.service.ts — تبدیل PR → PO
// ═══════════════════════════════════════════════════════════════
const apprPath = ROOT + '/backend/src/modules/approvals/approvals.service.ts';
let appr = fs.readFileSync(apprPath, 'utf8');
let apprChanged = false;

// imports
if (!appr.includes('NotFoundException')) {
  if (appr.includes("from '@nestjs/common'")) {
    appr = appr.replace(
      /import \{([^}]*)\} from '@nestjs\/common';/,
      (m, imps) => {
        const items = imps.split(',').map((s) => s.trim()).filter(Boolean);
        if (!items.includes('NotFoundException')) items.push('NotFoundException');
        return 'import { ' + items.join(', ') + " } from '@nestjs/common';";
      }
    );
  }
  apprChanged = true;
}

// جایگزینی case 'purchase-request' با تابع تبدیل
const oldPrCase = `      case 'purchase-request':
        return this.prisma.purchaseRequest.update({
          where: { id },
          data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        });`;

const newPrCase = `      case 'purchase-request':
        return this.approvePurchaseRequest(id, userId);`;

if (appr.includes(oldPrCase)) {
  appr = appr.replace(oldPrCase, newPrCase);
  apprChanged = true;
  console.log('✅ case PR با approvePurchaseRequest جایگزین شد');
}

// افزودن متد approvePurchaseRequest
if (!appr.includes('approvePurchaseRequest')) {
  const method = `
  private async approvePurchaseRequest(prId: string, userId: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: { items: true, purchaseOrders: true },
    });
    if (!pr) throw new NotFoundException('درخواست خرید پیدا نشد');

    // اگر قبلا تبدیل شده فقط تأیید کن
    if (pr.purchaseOrders.length > 0) {
      return this.prisma.purchaseRequest.update({
        where: { id: prId },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      });
    }

    // پیدا کردن کارپرداز (اولین کاربری که نقش purchaser دارد)
    let assignedToId: string | null = null;
    const purchaserRole = await this.prisma.role.findFirst({
      where: { code: 'purchaser' },
      include: { users: true },
    });
    if (purchaserRole && purchaserRole.users.length > 0) {
      assignedToId = purchaserRole.users[0].userId;
    }

    // تولید کد PO
    const year = new Date().getFullYear();
    const prefix = 'PO-' + year + '-';
    const lastPo = await this.prisma.purchaseOrder.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNum = lastPo ? parseInt(lastPo.code.slice(prefix.length), 10) : 0;
    const code = prefix + String(lastNum + 1).padStart(4, '0');

    // ساخت PO خودکار
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          code,
          prId: pr.id,
          projectId: pr.projectId,
          supplierId: null, // ← باید توسط کارپرداز پر شود
          poDate: new Date(),
          status: 'DRAFT',
          notes: 'تبدیل خودکار از درخواست خرید ' + pr.code,
          assignedToId,
          assignedAt: new Date(),
          createdById: userId,
          items: {
            create: pr.items.map((it) => ({
              rowNumber: it.rowNumber,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit,
              unitPrice: 0,
              totalPrice: 0,
              notes: it.notes,
            })),
          },
        },
      });

      await tx.purchaseRequest.update({
        where: { id: prId },
        data: {
          status: 'ORDERED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      return po;
    });
  }
`;

  // درج قبل از آخرین }
  const lastBrace = appr.lastIndexOf('}');
  appr = appr.slice(0, lastBrace) + method + appr.slice(lastBrace);
  apprChanged = true;
  console.log('✅ متد approvePurchaseRequest اضافه شد');
}

if (apprChanged) {
  fs.writeFileSync(apprPath, appr, 'utf8');
  console.log('✅ approvals.service.ts ذخیره شد');
}

console.log('');
console.log('=== DONE ===');