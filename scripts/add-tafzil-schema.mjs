import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const schemaPath = ROOT + '/backend/prisma/schema.prisma';
let s = fs.readFileSync(schemaPath, 'utf8');
let changed = false;

// ═══════════════════════════════════════════════════════════════
// 1) افزودن TAFZIL به AccountLevel enum
// ═══════════════════════════════════════════════════════════════
if (!s.includes('TAFZIL')) {
  s = s.replace(
    'enum AccountLevel {\n  GROUP // گروه\n  GENERAL // کل\n  SUBSIDIARY // معین\n}',
    'enum AccountLevel {\n  GROUP      // گروه\n  GENERAL    // کل\n  SUBSIDIARY // معین\n  TAFZIL     // تفصیلی\n}'
  );
  changed = true;
  console.log('OK AccountLevel.TAFZIL');
} else {
  console.log('SKIP TAFZIL');
}

// ═══════════════════════════════════════════════════════════════
// 2) افزودن DetailType enum
// ═══════════════════════════════════════════════════════════════
if (!s.includes('enum AccountDetailType')) {
  const enumDef = `
enum AccountDetailType {
  PARTNER     // شخص (مشتری/تأمین\u200Cکننده/پرسنل)
  ITEM        // کالا
  PETTY_CASH  // تنخواه\u200Cگردان
}
`;
  // درج قبل از enum AccountNature
  s = s.replace(
    'enum AccountNature {',
    enumDef + '\nenum AccountNature {'
  );
  changed = true;
  console.log('OK AccountDetailType enum');
} else {
  console.log('SKIP AccountDetailType');
}

// ═══════════════════════════════════════════════════════════════
// 3) افزودن detailType و detailId به Account
// ═══════════════════════════════════════════════════════════════
if (!s.includes('detailType')) {
  // پیدا کردن بلوک Account
  const accountBlock = s.match(/(model Account \{[\s\S]*?)(\n\})/);
  if (accountBlock) {
    const inner = accountBlock[1];
    const newInner = inner.replace(
      /(\n  description String\? @db\.VarChar\(500\))/,
      '$1\n\n  detailType AccountDetailType? // فقط برای TAFZIL\n  detailId   String?              @map("detail_id") @db.Uuid // UUID شخص/کالا/تنخواه'
    );
    s = s.replace(accountBlock[1] + accountBlock[2], newInner + accountBlock[2]);
    changed = true;
    console.log('OK Account.detailType/detailId');
  } else {
    console.log('!! Account block not found');
  }
} else {
  console.log('SKIP detailType');
}

if (changed) {
  fs.writeFileSync(schemaPath, s, 'utf8');
  console.log('\n✅ schema.prisma ذخیره شد');
} else {
  console.log('\nℹ تغییری لازم نبود');
}