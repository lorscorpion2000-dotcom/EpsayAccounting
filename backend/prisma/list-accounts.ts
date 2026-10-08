import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      subtype: true,
      level: true,
      isPostable: true,
    },
  });

  console.log(`Total accounts: ${accounts.length}\n`);
  console.log('code'.padEnd(15), 'level'.padEnd(8), 'postable'.padEnd(10), 'subtype'.padEnd(25), 'name');
  console.log('-'.repeat(100));
  for (const a of accounts) {
    console.log(
      String(a.code).padEnd(15),
      String(a.level).padEnd(8),
      String(a.isPostable).padEnd(10),
      String(a.subtype ?? '-').padEnd(25),
      a.name,
    );
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });