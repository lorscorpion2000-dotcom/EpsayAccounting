import { PrismaClient } from '@prisma/client';
import * as jalaali from 'jalaali-js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 آغاز Seed اولیه سیستم حسابداری اپسای با سال مالی شمسی...');
  const today = new Date();
  const jToday = jalaali.toJalaali(today);
  const shamsiYear = jToday.jy;
  const yearCode = String(shamsiYear);

  // محاسبه دقیق شروع (۱ فروردین) و پایان (۲۹/۳۰ اسفند) سال شمسی
  const startG = jalaali.toGregorian(shamsiYear, 1, 1);
  const isLeap = jalaali.isLeapJalaaliYear(shamsiYear);
  const endG = jalaali.toGregorian(shamsiYear, 12, isLeap ? 30 : 29);

  const startDate = new Date(Date.UTC(startG.gy, startG.gm - 1, startG.gd));
  const endDate = new Date(Date.UTC(endG.gy, endG.gm - 1, endG.gd, 23, 59, 59, 999));

  const existing = await prisma.fiscalYear.findFirst({
    where: { code: yearCode },
  });

  if (!existing) {
    await prisma.fiscalYear.create({
      data: {
        code: yearCode,
        name: `سال مالی ${yearCode}`,
        startDate,
        endDate,
        status: 'OPEN',
        isCurrent: true,
      },
    });
    console.log(`✅ سال مالی شمسی ${yearCode} با موفقیت ثبت شد.`);
  } else {
    console.log(`ℹ️ سال مالی شمسی ${yearCode} از قبل موجود است.`);
  }
  console.log('✨ عملیات Seed پایان یافت.');
}

main()
  .catch((e) => {
    console.error('❌ خطا در اجرای Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
