const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

  console.log('======== model ProjectBudget ========');
  const m = schema.match(/model\s+ProjectBudget\s*\{[\s\S]*?\n\}/);
  console.log(m ? m[0] : '(پیدا نشد)');

  console.log('\n======== enum WbsLevel ========');
  const e1 = schema.match(/enum\s+WbsLevel\s*\{[\s\S]*?\n\}/);
  console.log(e1 ? e1[0] : '(پیدا نشد)');

  console.log('\n======== enum WbsUnit ========');
  const e2 = schema.match(/enum\s+WbsUnit\s*\{[\s\S]*?\n\}/);
  console.log(e2 ? e2[0] : '(پیدا نشد)');

  console.log('\n======== ستون‌های project_budgets ========');
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns WHERE table_name='project_budgets'
     ORDER BY ordinal_position`
  );
  console.table(cols);

  console.log('\n======== ستون‌های wbs_items ========');
  const cols2 = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name='wbs_items' ORDER BY ordinal_position`
  );
  console.table(cols2);
}

main()
  .catch(e => console.error('X', e.message))
  .finally(() => prisma.$disconnect());