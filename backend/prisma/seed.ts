import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 آغاز عملیات Seed اولیه سیستم حسابداری اپسای...');
  const currentYear = new Date().getFullYear();
  const yearCode = String(currentYear);

  const existingFiscal = await prisma.fiscalYear.findFirst({
    where: { code: yearCode },
  });

  if (!existingFiscal) {
    await prisma.fiscalYear.create({
      data: {
        code: yearCode,
        name: `سال مالی ${yearCode}`,
        startDate: new Date(`${currentYear}-01-01`),
        endDate: new Date(`${currentYear}-12-31`),
        status: 'OPEN',
      },
    });
    console.log(`✅ سال مالی ${yearCode} ایجاد شد.`);
  }
  console.log('✨ عملیات Seed با موفقیت پایان یافت.');
}

main()
  .catch((e) => {
    console.error('❌ خطا در اجرای Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
