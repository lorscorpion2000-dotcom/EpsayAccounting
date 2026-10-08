import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.accountMapping.findMany({ select: { code: true, title: true }, orderBy: { code: 'asc' } });
for (const r of rows) console.log(r.code);
await p.$disconnect();
