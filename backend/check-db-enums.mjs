import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const sql = "SELECT typname FROM pg_type WHERE typtype = 'e' AND typname IN ('WbsUnit','PRItemUnit','ItemUnit','SalesUnit')";
const r = await p.$queryRawUnsafe(sql);
console.log('Enums in DB:');
for (const row of r) console.log(' -', row.typname);
await p.$disconnect();
