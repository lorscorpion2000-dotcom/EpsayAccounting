import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const sql = "SELECT table_name, column_name, data_type, udt_name FROM information_schema.columns WHERE column_name = 'unit' ORDER BY table_name";
const r = await p.$queryRawUnsafe(sql);
for (const row of r) console.log(row.table_name, '|', row.column_name, '|', row.data_type, '|', row.udt_name);
await p.$disconnect();
