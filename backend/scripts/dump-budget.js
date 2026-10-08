const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

  console.log('======== 1) model Budget ========');
  const m1 = schema.match(/model\s+Budget\s*\{[\s\S]*?\n\}/);
  console.log(m1 ? m1[0] : '(پیدا نشد)');

  console.log('\n======== 2) model WBS ========');
  const m2 = schema.match(/model\s+(WBS|Wbs|WbsItem|WorkBreakdown)\s*\{[\s\S]*?\n\}/);
  console.log(m2 ? m2[0] : '(پیدا نشد)');

  console.log('\n======== 3) مدل‌های مرتبط ========');
  const re = /^model\s+(\w*[Bb]udget\w*|\w*[Ww]bs\w*)\s*\{/gm;
  let m; while ((m = re.exec(schema)) !== null) console.log('   -', m[1]);

  console.log('\n======== 4) جدول‌های حاوی budget/wbs ========');
  const tables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%budget%' OR table_name ILIKE '%wbs%')`
  );
  console.log(tables.map(t => t.table_name).join(', ') || '(هیچ)');

  console.log('\n======== 5) ستون‌های journal_lines ========');
  const jl = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='journal_lines' ORDER BY ordinal_position`
  );
  console.table(jl);

  console.log('\n======== 6) نمونه Budget ========');
  for (const t of tables.map(x => x.table_name)) {
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${t}" LIMIT 5`);
      console.log(`   [${t}] rows=${rows.length}`);
      if (rows.length) console.log('   columns:', Object.keys(rows[0]).join(', '));
      console.table(rows);
    } catch (e) {
      console.log(`   [${t}] خطا: ${e.message}`);
    }
  }
}

main().catch(e => console.error('X', e.message)).finally(() => prisma.$disconnect());