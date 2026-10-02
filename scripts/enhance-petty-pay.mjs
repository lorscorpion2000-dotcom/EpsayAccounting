import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) requests.service.ts — تقویت markPaid
// ═══════════════════════════════════════════════════════════════
const svcPath = ROOT + '/backend/src/modules/petty-cash/requests.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');
let svcChanged = 0;

// بکاپ
fs.writeFileSync(svcPath + '.bak-charge', svc, 'utf8');

// پیدا کردن متد markPaid فعلی
const markPaidRegex = /async markPaid\(id: string\)\s*\{[\s\S]*?\n  \}/;

const oldMarkPaid = svc.match(markPaidRegex);
if (oldMarkPaid) {
  console.log('── markPaid فعلی ──');
  console.log(oldMarkPaid[0]);

  const newMarkPaid = `async markPaid(id: string, paidById?: string) {
    const req = await this.findOne(id);
    if (req.status !== 'APPROVED') {
      throw new BadRequestException('فقط درخواست تأیید\u200Cشده قابل پرداخت است');
    }

    return this.prisma.$transaction(async (tx) => {
      // ۱) افزایش موجودی تنخواه
      await tx.pettyCashAccount.update({
        where: { id: req.accountId },
        data: { balance: { increment: req.amount } },
      });

      // ۲) ساخت تراکنش تنخواه (FUNDING = شار)
      await tx.pettyCashTransaction.create({
        data: {
          accountId: req.accountId,
          code: await this.generateTxCode(tx),
          type: 'FUNDING',
          amount: req.amount,
          txDate: new Date(),
          description: 'شار تنخواه — ' + req.code + (req.reason ? ' (' + req.reason + ')' : ''),
          status: 'APPROVED',
          approvedById: paidById || null,
          approvedAt: new Date(),
        },
      });

      // ۳) به\u200Cروزرسانی وضعیت درخواست
      return tx.pettyCashRequest.update({
        where: { id },
        data: { status: 'PAID', paidAt: new Date() },
      });
    });
  }

  // تولید کد تراکنش
  private async generateTxCode(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PT-' + year + '-';
    const last = await tx.pettyCashTransaction.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNum = last ? parseInt(last.code.slice(prefix.length), 10) : 0;
    return prefix + String(lastNum + 1).padStart(4, '0');
  }`;

  svc = svc.replace(oldMarkPaid[0], newMarkPaid);
  svcChanged++;
  console.log('✅ markPaid تقویت شد (بالانس + تراکنش)');
} else {
  console.log('❌ markPaid پیدا نشد');
}

// چک import BadRequestException
if (!svc.includes('BadRequestException')) {
  if (svc.includes("from '@nestjs/common'")) {
    svc = svc.replace(
      /import \{([^}]*)\} from '@nestjs\/common';/,
      (m, imps) => {
        const items = imps.split(',').map((s) => s.trim()).filter(Boolean);
        if (!items.includes('BadRequestException')) items.push('BadRequestException');
        return 'import { ' + items.join(', ') + " } from '@nestjs/common';";
      }
    );
    svcChanged++;
    console.log('✅ import BadRequestException');
  }
}

if (svcChanged) {
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('✅ requests.service.ts ذخیره شد');
}

// ═══════════════════════════════════════════════════════════════
// 2) requests.controller.ts — پاس دادن userId به markPaid
// ═══════════════════════════════════════════════════════════════
const ctrlPath = ROOT + '/backend/src/modules/petty-cash/requests.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');
let ctrlChanged = 0;

// چک CurrentUser import
if (!ctrl.includes('CurrentUser')) {
  ctrl = ctrl.replace(
    /import \{([^}]*)\} from '@nestjs\/common';/,
    (m, imps) => {
      const items = imps.split(',').map((s) => s.trim()).filter(Boolean);
      return 'import { ' + items.join(', ') + " } from '@nestjs/common';";
    }
  );
  // Add import for CurrentUser decorator
  ctrl = ctrl.replace(
    /^(import.*from '@nestjs\/common';)/m,
    "$1\nimport { CurrentUser } from '../../common/decorators/current-user.decorator';"
  );
  ctrlChanged++;
  console.log('✅ import CurrentUser');
}

// به\u200Cروزرسانی pay endpoint
const payEndpointOld = /@Patch\(':id\/pay'\)[\s\S]*?\n  \}/;
const payMatch = ctrl.match(payEndpointOld);
if (payMatch && !payMatch[0].includes('CurrentUser')) {
  const newPay = `@Patch(':id/pay')
  pay(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.markPaid(id, userId);
  }`;
  ctrl = ctrl.replace(payMatch[0], newPay);
  ctrlChanged++;
  console.log('✅ pay endpoint به\u200Cروز شد');
}

if (ctrlChanged) {
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('✅ requests.controller.ts ذخیره شد');
}

console.log('');
console.log('=== DONE ===');