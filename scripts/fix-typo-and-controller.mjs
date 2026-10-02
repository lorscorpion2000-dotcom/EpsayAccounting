import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) رفع تایپو «شار» → «شار» در requests.service.ts
// ═══════════════════════════════════════════════════════════════
const svcPath = ROOT + '/backend/src/modules/petty-cash/requests.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');
let svcChanged = 0;

// استفاده از U+0698 () برای اطمینان
const zhe = String.fromCharCode(0x0698);
const wrong = 'شار ';
const right = 'شار' + zhe + ' ';

const before = svc;
svc = svc.split(wrong).join(right);
if (svc !== before) {
  svcChanged++;
  console.log('✅ تایپو «شار » → «شار » در service');
  fs.writeFileSync(svcPath, svc, 'utf8');
} else {
  console.log('ℹ service — تایپو پیدا نشد');
}

// ═══════════════════════════════════════════════════════════════
// 2) چک و رفع controller
// ═══════════════════════════════════════════════════════════════
const ctrlPath = ROOT + '/backend/src/modules/petty-cash/requests.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');
let ctrlChanged = 0;

console.log('\n── controller فعلی pay ──');
const payMatch = ctrl.match(/@Patch\(':id\/pay'\)[\s\S]{0,400}/);
if (payMatch) console.log(payMatch[0]);

// آیا Body import هست
if (!ctrl.match(/import\s*\{[^}]*\bBody\b/)) {
  ctrl = ctrl.replace(
    /import \{([^}]*)\} from '@nestjs\/common';/,
    (m, imps) => {
      const items = imps.split(',').map((s) => s.trim()).filter(Boolean);
      if (!items.includes('Body')) items.push('Body');
      return 'import { ' + items.join(', ') + " } from '@nestjs/common';";
    }
  );
  ctrlChanged++;
  console.log('✅ import Body');
}

// CurrentUser
if (!ctrl.includes('CurrentUser')) {
  ctrl = ctrl.replace(
    /(import \{ RequirePermissions \}[^\n]*\n)/,
    "$1import { CurrentUser } from '../../common/decorators/current-user.decorator';\n"
  );
  ctrlChanged++;
  console.log('✅ import CurrentUser');
}

// جایگزینی pay endpoint
if (payMatch && !payMatch[0].includes('sourceAccountId')) {
  const newPay = `@Patch(':id/pay')
  @RequirePermissions('petty-cash.update')
  pay(
    @Param('id') id: string,
    @Body() body: { sourceAccountId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.markPaid(id, body.sourceAccountId, userId);
  }`;
  
  ctrl = ctrl.replace(payMatch[0], newPay);
  ctrlChanged++;
  console.log('✅ pay endpoint به\u200Cروز شد');
} else if (payMatch && payMatch[0].includes('sourceAccountId')) {
  console.log('ℹ pay endpoint از قبل درست است');
}

if (ctrlChanged) {
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('✅ controller ذخیره شد (' + ctrlChanged + ' تغییر)');
}

// ═══════════════════════════════════════════════════════════════
// 3) نمایش نتیجه
// ═══════════════════════════════════════════════════════════════
console.log('\n── pay نهایی ──');
const finalPay = ctrl.match(/@Patch\(':id\/pay'\)[\s\S]{0,400}/);
if (finalPay) console.log(finalPay[0]);