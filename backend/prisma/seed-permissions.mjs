import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// [code, displayName]  —  module.action از code استخراج می‌شود
const PERMS = [
  // سیستم و کاربران
  ['users.read', 'مشاهده کاربران'],
  ['users.create', 'ایجاد کاربر'],
  ['users.update', 'ویرایش کاربر'],
  ['users.delete', 'حذف کاربر'],
  ['roles.read', 'مشاهده نقش‌ها'],
  ['roles.manage', 'مدیریت نقش‌ها و دسترسی‌ها'],

  // دایرکتوری
  ['partners.read', 'مشاهده اشخاص'],
  ['partners.create', 'ایجاد شخص'],
  ['partners.update', 'ویرایش شخص'],
  ['partners.delete', 'حذف شخص'],

  // پروژه‌ها
  ['projects.read', 'مشاهده پروژه‌ها'],
  ['projects.create', 'ایجاد پروژه'],
  ['projects.update', 'ویرایش پروژه'],
  ['projects.delete', 'حذف پروژه'],
  ['contracts.read', 'مشاهده قراردادهای کارفرمایی'],
  ['contracts.create', 'ایجاد قرارداد کارفرمایی'],
  ['contracts.update', 'ویرایش قرارداد'],
  ['wbs.read', 'مشاهده WBS'],
  ['wbs.manage', 'مدیریت WBS'],
  ['budgets.read', 'مشاهده بودجه'],
  ['budgets.manage', 'مدیریت بودجه'],

  // حسابداری
  ['accounting.accounts.read', 'مشاهده کدینگ حساب‌ها'],
  ['accounting.accounts.manage', 'مدیریت کدینگ حساب‌ها'],
  ['accounting.journals.read', 'مشاهده اسناد حسابداری'],
  ['accounting.journals.create', 'ثبت سند حسابداری'],
  ['accounting.journals.update', 'ویرایش سند'],
  ['accounting.journals.reverse', 'ابطال سند'],
  ['reports.read', 'مشاهده مرکز جامع گزارش‌ها'],
  ['accounting.reports.read', 'مشاهده گزارش‌های حسابداری'],
  ['accounting.fiscal-years.manage', 'مدیریت سال‌های مالی'],

  // تنخواه
  ['petty-cash.read', 'مشاهده تنخواه'],
  ['petty-cash.create', 'ثبت هزینه تنخواه'],
  ['petty-cash.approve', 'تأیید تراکنش‌های تنخواه'],

  // تأییدات
  ['approvals.read', 'مشاهده کارتابل'],
  ['approvals.approve', 'تأیید اسناد'],
  ['approvals.reject', 'رد اسناد'],

  // خرید
  ['procurement.read', 'مشاهده درخواست‌های خرید'],
  ['procurement.create', 'ایجاد درخواست خرید'],
  ['procurement.update', 'ویرایش درخواست/سفارش'],
  ['procurement.rfq.manage', 'مدیریت استعلام'],
  ['procurement.po.manage', 'مدیریت سفارش خرید'],

  // انبار
  ['warehouse.read', 'مشاهده انبار'],
  ['warehouse.items.manage', 'مدیریت کالا'],
  ['warehouse.receipts.manage', 'مدیریت رسید انبار'],
  ['warehouse.issues.manage', 'مدیریت حواله انبار'],
  ['warehouse.reports.read', 'مشاهده گزارشات انبار'],

  // عملیات کارگاه
  ['site-ops.read', 'مشاهده گزارش‌های کارگاه'],
  ['site-ops.create', 'ثبت گزارش روزانه'],
  ['site-ops.approve', 'تأیید گزارش روزانه'],

  // حقوق و دستمزد
  ['payroll.read', 'مشاهده حقوق و دستمزد'],
  ['payroll.employees.manage', 'مدیریت پرسنل'],
  ['payroll.attendance.manage', 'مدیریت حضور و غیاب'],
  ['payroll.periods.manage', 'مدیریت دوره‌های حقوقی'],
  ['payroll.statements.manage', 'مدیریت صورت‌وضعیت پیمانکار'],
  ['payroll.advance.manage', 'مدیریت مساعده'],

  // سرمایه شرکا
  ['partner-capital.read', 'مشاهده سرمایه شرکا'],
  ['partner-capital.manage', 'مدیریت آورده و برداشت'],

  // گاه‌شمار
  ['timeline.permits.read', 'مشاهده مجوزها'],
  ['timeline.permits.manage', 'مدیریت مجوزها'],
  ['timeline.insurances.read', 'مشاهده بیمه‌نامه‌ها'],
  ['timeline.insurances.manage', 'مدیریت بیمه‌نامه‌ها'],
  ['timeline.guarantees.read', 'مشاهده تضامین'],
  ['timeline.guarantees.manage', 'مدیریت تضامین'],
  ['timeline.documents.read', 'مشاهده اسناد فنی'],
  ['timeline.documents.manage', 'مدیریت اسناد فنی'],
  ['timeline.checklists.read', 'مشاهده چک‌لیست‌ها'],
  ['timeline.checklists.manage', 'مدیریت چک‌لیست‌ها'],

  // قراردادهای حقوقی
  ['legal-contracts.read', 'مشاهده قراردادها'],
  ['legal-contracts.create', 'ایجاد قرارداد'],
  ['legal-contracts.update', 'ویرایش قرارداد'],
  ['legal-contracts.cancel', 'ابطال قرارداد'],
  ['legal-contracts.parties.manage', 'مدیریت طرف‌های قرارداد'],

  // فروش
  ['sales.units.read', 'مشاهده واحدها'],
  ['sales.units.manage', 'مدیریت واحدها'],
  ['sales.customers.read', 'مشاهده مشتریان'],
  ['sales.customers.manage', 'مدیریت مشتریان'],
  ['sales.contracts.read', 'مشاهده قراردادهای فروش'],
  ['sales.contracts.create', 'ایجاد قرارداد فروش'],
  ['sales.contracts.update', 'ویرایش قرارداد فروش'],
  ['sales.contracts.cancel', 'ابطال قرارداد فروش'],
  ['sales.payments.manage', 'ثبت پرداخت فروش'],

  // داشبورد
  ['dashboard.read', 'مشاهده داشبورد'],
  // لاگ تغییرات
  // پشتیبان‌گیری
  ['backup.read',   'مشاهده پشتیبان‌ها'],
  ['backup.manage', 'اجرای پشتیبان‌گیری و حذف'],

  ['audit.read', 'مشاهده لاگ تغییرات'],

  // اعلان‌ها
  ['notification.read',   'مشاهده اعلان‌ها'],
  ['notification.manage', 'مدیریت و پاک‌سازی اعلان‌ها'],

  // اسناد حسابداری — حذف ویژه
  ['journal.delete', 'حذف سند حسابداری (فقط مدیر ارشد)'],
  ['journal.force-delete', 'حذف سند Posted (فقط مدیر ارشد)'],
  ['journal.view-deletions', 'مشاهده لاگ حذف اسناد'],

  // CRUD delete perms — wave 7
  ['adjustment.delete', 'حذف تعدیل'],
  ['materialpricediff.delete', 'حذف اختلاف قیمت'],
  ['attachment.delete', 'حذف پیوست'],
  ['capitalaccount.delete', 'حذف حساب سرمایه'],
  ['attendance.delete', 'حذف حضور و غیاب'],
  ['pettycashrequest.delete', 'حذف درخواست تنخواه'],
  ['rfq.delete', 'حذف استعلام'],
  ['supplierpayment.delete', 'حذف پرداخت تأمین‌کننده'],
  ['salesreceipt.delete', 'حذف رسید فروش'],
  ['audit.manage', 'مدیریت و پاک‌سازی لاگ'],

  // ماشین‌آلات
  ['equipment.read',               'مشاهده ماشین‌آلات'],
  ['equipment.create',             'ایجاد ماشین'],
  ['equipment.update',             'ویرایش ماشین'],
  ['equipment.delete',             'حذف ماشین'],
  ['equipment.logs.manage',        'مدیریت کارکرد روزانه'],
  ['equipment.maintenance.manage', 'مدیریت تعمیرات'],
  ['price-list.read',   'مشاهده فهرست بها'],
  ['price-list.manage', 'مدیریت فهرست بها'],

  // تسهیم سربار
  ['overhead.read',   'مشاهده تسهیم سربار'],
  ['overhead.manage', 'مدیریت تسهیم سربار'],
  ['client-statement.read',   'مشاهده صورت‌وضعیت کارفرما'],
  ['client-statement.manage', 'مدیریت صورت‌وضعیت کارفرما'],

  // WIP
  ['wip.read', 'مشاهده کار در جریان ساخت'],

  // Data I/O
  ['data-io.read',   'خروج داده‌ها'],
  ['data-io.manage', 'ورود داده‌ها'],

  // گزارش مصرف مصالح
  ['material-report.read', 'گزارش مصرف مصالح و بهای واحد'],

  // انبارگردانی و انتقال
  ['inventory-count.read',      'مشاهده انبارگردانی'],
  ['inventory-count.manage',    'مدیریت انبارگردانی'],
  ['warehouse-transfer.read',   'مشاهده انتقال بین انبارها'],
  ['warehouse-transfer.manage', 'مدیریت انتقال بین انبارها'],

  // تعدیل و مابه‌التفاوت
  ['adjustment.read',   'مشاهده تعدیل و مابه‌التفاوت'],
  ['adjustment.manage', 'مدیریت تعدیل و مابه‌التفاوت'],

  // گزارش‌های مالیاتی
  ['tax-reports.read', 'مشاهده گزارش‌های مالیاتی'],

  // گزارش‌های عملیاتی
  ['operational-reports.read', 'مشاهده گزارش‌های عملیاتی'],
];

async function main() {
  console.log('=== Seeding permissions ===\n');

  let created = 0;
  let skipped = 0;

  for (const [code, displayName] of PERMS) {
    const exists = await prisma.permission.findFirst({ where: { code } });
    if (exists) { skipped++; continue; }

    // استخراج module و action از code: "users.read" → module="users", action="read"
    const parts = code.split('.');
    const action = parts[parts.length - 1];
    const module = parts.slice(0, -1).join('.');

    await prisma.permission.create({
      data: {
        code,
        displayName,
        module,
        action,
      },
    });
    created++;
  }

  console.log('[OK] ' + created + ' permission ساخته شد');
  console.log('[INFO] ' + skipped + ' از قبل موجود بود');

  // اتصال همه به نقش admin
  const adminRole = await prisma.role.findFirst({ where: { code: 'admin' } });
  if (!adminRole) { console.log('[ERR] نقش admin پیدا نشد!'); return; }

  const allPerms = await prisma.permission.findMany();
  let linked = 0;
  for (const p of allPerms) {
    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: adminRole.id, permissionId: p.id },
    });
    if (!exists) {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: p.id },
      });
      linked++;
    }
  }
  console.log('[OK] ' + linked + ' permission به نقش admin متصل شد');

  console.log('');
  console.log('=======================================');
  console.log('  آماده ورود');
  console.log('  نام کاربری: admin');
  console.log('  رمز عبور:   Admin@1234');
  console.log('=======================================');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());