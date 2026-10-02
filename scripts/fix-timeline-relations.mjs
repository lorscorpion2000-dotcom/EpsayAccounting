// E:\EpsayAccounting\scripts\fix-timeline-relations.mjs
import fs from 'node:fs';

const schemaPath = 'E:/EpsayAccounting/backend/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

console.log('=== Fix Timeline Relations ===\n');

// 1) حذف ۵ خط اشتباه از Partner
const wrongBlockInPartner = `  permits             Permit[]
  insurances          Insurance[]
  guarantees          Guarantee[]
  technicalDocuments  TechnicalDocument[]
  phaseChecklists     PhaseChecklist[]
`;
if (schema.includes(wrongBlockInPartner)) {
  schema = schema.replace(wrongBlockInPartner, '');
  console.log('  ✓ 5 خط اشتباه از Partner حذف شد');
} else {
  console.log('  ⚠ بلوک اشتباه در Partner پیدا نشد — ممکن است قبلاً حذف شده باشد');
}

// 2) اضافه کردن به Project (بعد از capitalAccounts آن)
// در Project خطی مثل `capitalAccounts       PartnerCapitalAccount[]` هست
// ما باید بعد از آن ۵ خط اضافه کنیم
const projectAnchor = `  capitalAccounts       PartnerCapitalAccount[]`;

// چک کنیم که قبلاً اضافه نشده باشد
if (schema.includes('  permits             Permit[]')) {
  console.log('  ℹ بلوک قبلاً در جای درست وجود دارد');
} else {
  // پیدا کردن آخرین occurrence (که در Project است)
  const parts = schema.split(projectAnchor);
  if (parts.length === 2) {
    // فقط یک occurrence — یعنی anchor یگانه است
    const newBlock = projectAnchor + `
  permits             Permit[]
  insurances          Insurance[]
  guarantees          Guarantee[]
  technicalDocuments  TechnicalDocument[]
  phaseChecklists     PhaseChecklist[]`;
    schema = parts[0] + newBlock + parts[1];
    console.log('  ✓ 5 خط به Project اضافه شد');
  } else if (parts.length > 2) {
    // چند occurrence — آخرین را هدف می‌گیریم
    const lastIdx = schema.lastIndexOf(projectAnchor);
    const before = schema.slice(0, lastIdx + projectAnchor.length);
    const after = schema.slice(lastIdx + projectAnchor.length);

    const newBlock = `
  permits             Permit[]
  insurances          Insurance[]
  guarantees          Guarantee[]
  technicalDocuments  TechnicalDocument[]
  phaseChecklists     PhaseChecklist[]`;

    schema = before + newBlock + after;
    console.log('  ✓ 5 خط به آخرین occurrence اضافه شد (Project)');
  } else {
    console.log('  ✗ anchor در Project پیدا نشد');
  }
}

// 3) ذخیره
fs.writeFileSync(schemaPath, schema, 'utf8');

console.log('\n=== Validate Schema ===\n');

// 4) چک نهایی: هر ۵ relation در Partner نیست
if (schema.includes('  permits             Permit[]')) {
  // بررسی که داخل Partner نباشد
  const partnerMatch = schema.match(/model Partner \{[\s\S]*?\n\}/);
  if (partnerMatch && partnerMatch[0].includes('permits             Permit[]')) {
    console.log('  ✗ خطا: هنوز در Partner است');
  } else {
    console.log('  ✓ relations از Partner حذف شده‌اند');
  }
}

// 5) بررسی که در Project هست
const projectMatch = schema.match(/model Project \{[\s\S]*?\n\}/);
if (projectMatch && projectMatch[0].includes('permits             Permit[]')) {
  console.log('  ✓ relations در Project هستند');
} else {
  console.log('  ⚠ relations در Project پیدا نشدند — بررسی دستی لازم است');
}

console.log('\n=============================================');
console.log('  ✅ اصلاح انجام شد');
console.log('=============================================');
console.log('\nNext:');
console.log('  cd E:\\EpsayAccounting\\backend');
console.log('  npx prisma migrate dev --name add_timeline_module');
console.log('');