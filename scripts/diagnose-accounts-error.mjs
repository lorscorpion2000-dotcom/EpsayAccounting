import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// 1) چک schema — detailType/detailId واقعاً اضافه شده؟
const schema = fs.readFileSync(ROOT + '/backend/prisma/schema.prisma', 'utf8');
const hasDetailType = schema.includes('detailType');
const hasDetailId = schema.includes('detailId');
const hasTafzil = schema.includes('TAFZIL');

console.log('═══ Schema ═══');
console.log((hasDetailType ? '✅' : '❌') + ' detailType');
console.log((hasDetailId ? '✅' : '❌') + ' detailId');
console.log((hasTafzil ? '✅' : '❌') + ' TAFZIL in enum');
console.log('');

// 2) چک service — create/update پچ شد؟
const svcPath = ROOT + '/backend/src/modules/accounting/accounts.service.ts';
const svc = fs.readFileSync(svcPath, 'utf8');
console.log('═══ accounts.service.ts ═══');
console.log((svc.includes('detailType: dto.detailType') || svc.includes('detailType: (dto as any).detailType') ? '✅' : '❌') + ' create: detailType');
console.log((svc.includes("dto.detailType !== undefined") ? '✅' : '❌') + ' update: detailType');
console.log('');

// 3) چک DTO
const dtoPath = ROOT + '/backend/src/modules/accounting/dto/create-account.dto.ts';
const dto = fs.readFileSync(dtoPath, 'utf8');
console.log('═══ create-account.dto.ts ═══');
console.log((dto.includes('detailType') ? '✅' : '❌') + ' detailType in DTO');
console.log((dto.includes('detailId') ? '✅' : '❌') + ' detailId in DTO');
console.log('');

// 4) چک Prisma Client
const prismaClientPath = ROOT + '/backend/node_modules/.prisma/client/index.d.ts';
if (fs.existsSync(prismaClientPath)) {
  const pc = fs.readFileSync(prismaClientPath, 'utf8');
  console.log('═══ Prisma Client ═══');
  console.log((pc.includes('detailType') || pc.includes('detail_type') ? '✅' : '❌') + ' detailType در Client');
}