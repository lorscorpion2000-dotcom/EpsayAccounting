import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const sp = ROOT + '/backend/prisma/schema.prisma';
let s = fs.readFileSync(sp, 'utf8');

// پیدا کردن مدل JournalLine
const m = s.match(/(model JournalLine \{[\s\S]*?partnerId\s+String\?\s+@map\("partner_id"\)\s+@db\.Uuid)([\s\S]*?\n\})/);
if (m && !s.includes('partner      Partner?   @relation("JournalLinePartner"')) {
  // افزودن relation بعد از partnerId
  s = s.replace(
    'partnerId String? @map("partner_id") @db.Uuid',
    'partnerId String? @map("partner_id") @db.Uuid\n  partner   Partner? @relation("JournalLinePartner", fields: [partnerId], references: [id])\n  project   Project? @relation("JournalLineProject", fields: [projectId], references: [id])'
  );
  console.log('OK JournalLine relations');

  // افزودن relation معکوس در Partner (اگر نیست)
  if (!s.includes('journalLinesAsPartner')) {
    s = s.replace(
      'model Partner {',
      'model Partner {\n  journalLinesAsPartner   JournalLine[] @relation("JournalLinePartner")'
    );
    console.log('OK Partner reverse');
  }

  // افزودن relation معکوس در Project
  if (!s.includes('journalLinesAsProject')) {
    s = s.replace(
      /model Project \{[\s\S]*?@@map\("projects"\)/,
      (block) => block.replace(
        '  salesUnits              SalesUnit[]              @relation("ProjectSalesUnits")',
        '  salesUnits              SalesUnit[]              @relation("ProjectSalesUnits")\n  journalLinesAsProject   JournalLine[]            @relation("JournalLineProject")'
      )
    );
    console.log('OK Project reverse');
  }

  fs.writeFileSync(sp, s, 'utf8');
} else {
  console.log('ℹ از قبل تنظیم شده یا anchor پیدا نشد');
}