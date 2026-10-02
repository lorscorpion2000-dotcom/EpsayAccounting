import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const roles = [
  { code: 'accountant', displayName: 'حسابدار', description: 'دسترسی به حسابداری و پرداخت\u200Cها' },
  { code: 'purchaser', displayName: 'کارپرداز', description: 'مدیریت خرید و تأمین' },
  { code: 'site_supervisor', displayName: 'سرپرست کارگاه', description: 'مدیریت کارگاه و گزارش روزانه' },
  { code: 'project_manager', displayName: 'مدیر پروژه', description: 'مدیریت پروژه\u200Cها و صورت\u200Cوضعیت' },
  { code: 'warehouse_keeper', displayName: 'انباردار', description: 'مدیریت انبار' },
  { code: 'hr', displayName: 'منابع انسانی', description: 'مدیریت پرسنل و مرخصی' },
  { code: 'approver', displayName: 'تأییدکننده عمومی', description: 'دسترسی به کارتابل عمومی' },
];

for (const r of roles) {
  const exists = await p.role.findFirst({ where: { code: r.code } });
  if (!exists) {
    await p.role.create({ data: r });
    console.log('✅ نقش ' + r.code + ' ساخته شد');
  } else {
    console.log('ℹ نقش ' + r.code + ' از قبل هست');
  }
}

await p.$disconnect();