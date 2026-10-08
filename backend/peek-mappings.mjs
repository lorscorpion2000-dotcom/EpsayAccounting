import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.accountMapping.findMany({
  where: { OR: [
    { code: { contains: 'FIXED' } },
    { code: { contains: 'ASSET' } },
    { code: { contains: 'DEPREC' } },
  ]},
  include: {
    debitAccount: { select: { id: true, code: true, name: true } },
    creditAccount: { select: { id: true, code: true, name: true } },
  },
});
for (const r of rows) {
  console.log(r.code, '|', 'Db=' + (r.debitAccount?.code || '-'), '|', 'Cr=' + (r.creditAccount?.code || '-'));
}
await p.$disconnect();
