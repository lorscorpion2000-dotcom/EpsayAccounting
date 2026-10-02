import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) رفع po.service.ts — supplierId: dto.supplierId || null
// ═══════════════════════════════════════════════════════════════
const poPath = ROOT + '/backend/src/modules/procurement/po.service.ts';
let po = fs.readFileSync(poPath, 'utf8');
let poChanged = 0;

if (po.includes('supplierId: dto.supplierId,')) {
  po = po.replace('supplierId: dto.supplierId,', 'supplierId: dto.supplierId || null,');
  poChanged++;
  console.log('✅ po.service — supplierId || null');
} else if (po.includes('supplierId: dto.supplierId }')) {
  // حالت دیگر
  po = po.replace(/supplierId: dto\.supplierId\b/g, 'supplierId: dto.supplierId || null');
  poChanged++;
  console.log('✅ po.service — supplierId || null (regex)');
}

if (poChanged) {
  fs.writeFileSync(poPath, po, 'utf8');
}

// ═══════════════════════════════════════════════════════════════
// 2) افزودن approvePurchaseRequest به approvals.service.ts
// ═══════════════════════════════════════════════════════════════
const apprPath = ROOT + '/backend/src/modules/approvals/approvals.service.ts';
let appr = fs.readFileSync(apprPath, 'utf8');

if (appr.includes('this.approvePurchaseRequest') && !appr.includes('private async approvePurchaseRequest')) {
  console.log('⚠ case PR هست ولی متد نیست — اضافه می‌کنم');
  
  const method = `
  private async approvePurchaseRequest(prId: string, userId: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: { items: true, purchaseOrders: true },
    });
    if (!pr) throw new NotFoundException('درخواست خرید پیدا نشد');

    if (pr.purchaseOrders && pr.purchaseOrders.length > 0) {
      return this.prisma.purchaseRequest.update({
        where: { id: prId },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      });
    }

    // کارپرداز
    let assignedToId: string | null = null;
    const purchaserRole = await this.prisma.role.findFirst({
      where: { code: 'purchaser' },
      include: { users: true },
    });
    if (purchaserRole && purchaserRole.users.length > 0) {
      assignedToId = purchaserRole.users[0].userId;
    }

    // کد PO
    const year = new Date().getFullYear();
    const prefix = 'PO-' + year + '-';
    const lastPo = await this.prisma.purchaseOrder.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNum = lastPo ? parseInt(lastPo.code.slice(prefix.length), 10) : 0;
    const code = prefix + String(lastNum + 1).padStart(4, '0');

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          code,
          prId: pr.id,
          projectId: pr.projectId,
          supplierId: null,
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
  
  // چک import NotFoundException
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
      console.log('✅ import NotFoundException');
    }
  }
  
  fs.writeFileSync(apprPath, appr, 'utf8');
  console.log('✅ approvePurchaseRequest اضافه شد');
} else if (appr.includes('private async approvePurchaseRequest')) {
  console.log('ℹ متد approvePurchaseRequest از قبل هست');
} else {
  console.log('⚠ case PR نیست و متد هم نیست — باید دستی');
}

console.log('');
console.log('=== DONE ===');