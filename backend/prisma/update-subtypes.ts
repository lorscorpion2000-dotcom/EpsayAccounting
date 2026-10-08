import 'dotenv/config';
import { PrismaClient, AccountSubtype } from '@prisma/client';

const prisma = new PrismaClient();

const map: Record<string, AccountSubtype> = {
  // ---- دارایی جاری ----
  '1.1.1': 'CASH',                          // موجودی نقد و بانک
  '1.1.2': 'ACCOUNTS_RECEIVABLE',           // حسابهای دریافتنی
  '1.1.3': 'INVENTORY',                     // موجودی مواد و کالا
  '1.1.4': 'PREPAID',                       // پیش پرداخت ها
  '1.1.5': 'CASH',                          // تنخواه گردان ها

  // ---- دارایی غیرجاری ----
  '1.2.1': 'FIXED_ASSET',                   // دارایی ثابت
  '1.2.2': 'ACCUMULATED_DEPRECIATION',      // استهلاک انباشته

  // ---- بدهی جاری ----
  '2.1.1': 'ACCOUNTS_PAYABLE',              // حسابهای پرداختنی
  '2.1.2': 'SALARY_PAYABLE',                // بدهی پرسنلی
  '2.1.3': 'TAX_PAYABLE',                   // مالیات و عوارض
  '2.1.4': 'INSURANCE_PAYABLE',             // بیمه تأمین اجتماعی
  '2.1.5': 'ACCOUNTS_PAYABLE',              // پیمانکاران و تأمین کنندگان

  // ---- سرمایه ----
  '3.3':   'RETAINED_EARNINGS',             // سود و زیان انباشته
};

async function main() {
  let total = 0;
  for (const [code, subtype] of Object.entries(map)) {
    const res = await prisma.account.updateMany({
      where: { code },
      data: { subtype },
    });
    const mark = res.count > 0 ? '✅' : '⚠️ ';
    console.log(`${mark} ${code.padEnd(8)} -> ${subtype.padEnd(25)} (${res.count})`);
    total += res.count;
  }
  console.log(`\nTotal updated: ${total}`);

  // نمایش نهایی برای تأیید
  const final = await prisma.account.findMany({
    where: { subtype: { not: null } },
    orderBy: { code: 'asc' },
    select: { code: true, name: true, subtype: true },
  });
  console.log('\n=== Accounts with subtype ===');
  for (const a of final) {
    console.log(`${a.code.padEnd(8)} ${String(a.subtype).padEnd(25)} ${a.name}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });