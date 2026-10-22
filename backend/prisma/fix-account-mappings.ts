import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MAPPINGS: Record<string, string> = {
  CHEQUE_CANCELLED: 'ابطال چک صادره',
  CHEQUE_COLLECTED: 'وصول چک دریافتی',
  CHEQUE_ISSUED_PENDING: 'چک صادره - تعهد',
  CHEQUE_PASSED: 'وصول چک صادره',
  CHEQUE_RECEIVED: 'چک دریافتی',
  CHEQUE_RECEIVED_RETURNED: 'برگشت چک دریافتی',
  CHEQUE_RETURNED: 'برگشت چک صادره',
  DEPRECIATION_MONTHLY: 'استهلاک ماهانه',
  EQUIPMENT_COST: 'کارکرد روزانه ماشین',
  EQUIPMENT_MAINTENANCE: 'تعمیرات و سرویس ماشین',
  FIXED_ASSET_ACQUISITION: 'تملک دارایی ثابت',
  GOODS_ISSUE: 'حواله مصرف مصالح',
  GOODS_RECEIPT: 'رسید انبار (GRNI)',
  GOODS_RETURN: 'برگشت مصالح به تأمین‌کننده',
  PAYROLL_ACCRUAL: 'حقوق ستادی',
  PAYROLL_ACCRUAL_FIELD: 'دستمزد کارگاهی',
  PETTYCASH_EXPENSE: 'هزینه تنخواه',
  PETTYCASH_FUND: 'شارژ تنخواه',
  PURCHASE_CASH: 'خرید نقدی',
  PURCHASE_CREDIT: 'خرید نسیه',
  PURCHASE_VAT: 'مالیات خرید',
  SALES_INVOICE_REVENUE: 'درآمد فروش',
  SALES_RECEIPT: 'دریافت از مشتری',
  SALES_VAT: 'مالیات فروش',
  SALE_CONTRACT_CASH: 'دریافت نقدی فروش',
  SUPPLIER_PAYMENT: 'پرداخت به تأمین‌کننده',
};

async function fixMappings() {
  console.log('شروع اصلاح عناوین نگاشت‌های حساب...');
  for (const [code, title] of Object.entries(MAPPINGS)) {
    await prisma.accountMapping.updateMany({
      where: { code },
      data: { title },
    });
  }
  console.log('✓ تمام ۲۶ عنوان نگاشت خودکار با انکودینگ UTF-8 در دیتابیس اصلاح شدند.');
}

fixMappings()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());