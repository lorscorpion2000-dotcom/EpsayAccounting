const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name='accounts'`
  );
  const set = new Set(cols.map(c => c.column_name));
  console.log('📋 accounts columns:', [...set].join(', '));

  // انتخاب نام ستون‌ها با کوتیشن درست
  function pick(...names) {
    for (const n of names) {
      if (set.has(n)) {
        // هر ستونی که حرف بزرگ داره یا کلمه رزرو است، نیاز به " دارد
        return /[A-Z]/.test(n) ? `"${n}"` : n;
      }
    }
    return null;
  }

  const codeCol       = pick('code')       || 'code';
  const nameCol       = pick('name')       || 'name';
  const levelCol      = pick('level')      || 'level';
  const natureCol     = pick('nature')     || 'nature';
  const postableCol   = pick('is_postable', 'isPostable');
  const detailTypeCol = pick('detailType', 'detail_type');

  const q = (c) => c ? c : 'NULL';

  const accounts = await prisma.$queryRawUnsafe(
    `SELECT ${codeCol} AS code, ${nameCol} AS name, ${levelCol} AS level, ${natureCol} AS nature,
            ${q(postableCol)} AS postable, ${q(detailTypeCol)} AS dtype
     FROM accounts
     WHERE code LIKE '1.%' OR code LIKE '2.%' OR code LIKE '7.%'
     ORDER BY code`
  );
  console.log('\n📋 Chart of accounts (relevant):');
  console.table(accounts);

  const types = await prisma.$queryRawUnsafe(
    `SELECT t.typname, e.enumlabel
     FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname IN ('AccountType','AccountLevel','AccountNature','AccountDetailType')
     ORDER BY t.typname, e.enumsortorder`
  );
  console.log('\n📋 enum values:');
  for (const row of types) console.log(`   ${row.typname}: ${row.enumlabel}`);

  const maps = await prisma.$queryRawUnsafe(`SELECT code, title FROM account_mappings ORDER BY code`);
  console.log('\n📋 AccountMapping codes:');
  console.table(maps);
}

main()
  .catch(e => console.error('💥', e.message))
  .finally(() => prisma.$disconnect());