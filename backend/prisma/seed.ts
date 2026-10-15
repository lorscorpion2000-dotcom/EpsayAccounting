// ============================================================
// Epsay Accounting - Database Seed (Unified)
// ============================================================
// این فایل تنها منبع حقیقت (Single Source of Truth) برای:
//   - permissions (کامل، مطابق کنترلرها)
//   - roles (شامل accountant و hr)
//   - users (admin, hassan, mehdi)
//
// اجرا:
//   npx tsx prisma/seed.ts
// یا:
//   node --import tsx prisma/seed.ts
// ============================================================

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================
// 1) PERMISSIONS — لیست کامل
// ============================================================
type PermDef = { code: string; displayName: string };

const PERMISSIONS: PermDef[] = [
  // --- سیستم و کاربران ---
  { code: 'users.read',                displayName: 'مشاهده کاربران' },
  { code: 'users.create',              displayName: 'ایجاد کاربر' },
  { code: 'users.update',              displayName: 'ویرایش کاربر' },
  { code: 'users.delete',              displayName: 'حذف کاربر' },
  { code: 'roles.read',                displayName: 'مشاهده نقش‌ها' },
  { code: 'roles.manage',              displayName: 'مدیریت نقش‌ها و دسترسی‌ها' },

  // --- دایرکتوری ---
  { code: 'partners.read',             displayName: 'مشاهده اشخاص' },
  { code: 'partners.create',           displayName: 'ایجاد شخص' },
  { code: 'partners.update',           displayName: 'ویرایش شخص' },
  { code: 'partners.delete',           displayName: 'حذف شخص' },

  // --- پروژه‌ها ---
  { code: 'projects.read',             displayName: 'مشاهده پروژه‌ها' },
  { code: 'projects.create',           displayName: 'ایجاد پروژه' },
  { code: 'projects.update',           displayName: 'ویرایش پروژه' },
  { code: 'projects.delete',           displayName: 'حذف پروژه' },
  { code: 'contracts.read',            displayName: 'مشاهده قراردادهای کارفرمایی' },
  { code: 'contracts.create',          displayName: 'ایجاد قرارداد کارفرمایی' },
  { code: 'contracts.update',          displayName: 'ویرایش قرارداد' },
  { code: 'wbs.read',                  displayName: 'مشاهده WBS' },
  { code: 'wbs.manage',                displayName: 'مدیریت WBS' },
  { code: 'budgets.read',              displayName: 'مشاهده بودجه' },
  { code: 'budgets.manage',            displayName: 'مدیریت بودجه' },

  // --- حسابداری ---
  { code: 'accounting.accounts.read',  displayName: 'مشاهده کدینگ حساب‌ها' },
  { code: 'accounting.accounts.manage',displayName: 'مدیریت کدینگ حساب‌ها' },
  { code: 'accounting.journals.read',  displayName: 'مشاهده اسناد حسابداری' },
  { code: 'accounting.journals.create',displayName: 'ثبت سند حسابداری' },
  { code: 'accounting.journals.update',displayName: 'ویرایش سند' },
  { code: 'accounting.journals.reverse',displayName: 'ابطال سند' },
  { code: 'accounting.reports.read',   displayName: 'مشاهده گزارش‌ها' },
  { code: 'accounting.fiscal-years.manage', displayName: 'مدیریت سال‌های مالی' },
  { code: 'accounting.read',           displayName: 'مشاهده حسابداری' },
  { code: 'accounting.create',         displayName: 'ایجاد حسابداری' },
  { code: 'accounting.update',         displayName: 'ویرایش حسابداری' },
  { code: 'accounting.delete',         displayName: 'حذف حسابداری' },
  { code: 'journal.delete',            displayName: 'حذف سند حسابداری (فقط مدیر ارشد)' },
  { code: 'journal.force-delete',      displayName: 'حذف سند Posted (فقط مدیر ارشد)' },
  { code: 'journal.view-deletions',    displayName: 'مشاهده لاگ حذف اسناد' },

  // --- تنخواه ---
  { code: 'petty-cash.read',           displayName: 'مشاهده تنخواه' },
  { code: 'petty-cash.create',         displayName: 'ثبت هزینه تنخواه' },
  { code: 'petty-cash.approve',        displayName: 'تأیید تراکنش‌های تنخواه' },

  // --- تأییدات ---
  { code: 'approvals.read',            displayName: 'مشاهده کارتابل' },
  { code: 'approvals.approve',         displayName: 'تأیید اسناد' },
  { code: 'approvals.reject',          displayName: 'رد اسناد' },

  // --- خرید ---
  { code: 'procurement.read',          displayName: 'مشاهده درخواست‌های خرید' },
  { code: 'procurement.create',        displayName: 'ایجاد درخواست خرید' },
  { code: 'procurement.update',        displayName: 'ویرایش درخواست/سفارش' },
  { code: 'procurement.rfq.manage',    displayName: 'مدیریت استعلام' },
  { code: 'procurement.po.manage',     displayName: 'مدیریت سفارش خرید' },

  // --- انبار ---
  { code: 'warehouse.read',            displayName: 'مشاهده انبار' },
  { code: 'warehouse.items.manage',    displayName: 'مدیریت کالا' },
  { code: 'warehouse.receipts.manage', displayName: 'مدیریت رسید انبار' },
  { code: 'warehouse.issues.manage',   displayName: 'مدیریت حواله انبار' },
  { code: 'warehouse.reports.read',    displayName: 'مشاهده گزارشات انبار' },

  // --- انبارگردانی و انتقال ---
  { code: 'inventory-count.read',      displayName: 'مشاهده انبارگردانی' },
  { code: 'inventory-count.manage',    displayName: 'مدیریت انبارگردانی' },
  { code: 'warehouse-transfer.read',   displayName: 'مشاهده انتقال بین انبارها' },
  { code: 'warehouse-transfer.manage', displayName: 'مدیریت انتقال بین انبارها' },

  // --- عملیات کارگاه ---
  { code: 'site-ops.read',             displayName: 'مشاهده گزارش‌های کارگاه' },
  { code: 'site-ops.create',           displayName: 'ثبت گزارش روزانه' },
  { code: 'site-ops.approve',          displayName: 'تأیید گزارش روزانه' },

  // --- حقوق و دستمزد ---
  { code: 'payroll.read',              displayName: 'مشاهده حقوق و دستمزد' },
  { code: 'payroll.employees.manage',  displayName: 'مدیریت پرسنل' },
  { code: 'payroll.attendance.manage', displayName: 'مدیریت حضور و غیاب' },
  { code: 'payroll.periods.manage',    displayName: 'مدیریت دوره‌های حقوقی' },
  { code: 'payroll.statements.manage', displayName: 'مدیریت صورت‌وضعیت پیمانکار' },
  { code: 'payroll.advance.manage',    displayName: 'مدیریت مساعده' },

  // --- سرمایه شرکا ---
  { code: 'partner-capital.read',      displayName: 'مشاهده سرمایه شرکا' },
  { code: 'partner-capital.manage',    displayName: 'مدیریت آورده و برداشت' },

  // --- گاه‌شمار ---
  { code: 'timeline.permits.read',     displayName: 'مشاهده مجوزها' },
  { code: 'timeline.permits.manage',   displayName: 'مدیریت مجوزها' },
  { code: 'timeline.insurances.read',  displayName: 'مشاهده بیمه‌نامه‌ها' },
  { code: 'timeline.insurances.manage',displayName: 'مدیریت بیمه‌نامه‌ها' },
  { code: 'timeline.guarantees.read',  displayName: 'مشاهده تضامین' },
  { code: 'timeline.guarantees.manage',displayName: 'مدیریت تضامین' },
  { code: 'timeline.documents.read',   displayName: 'مشاهده اسناد فنی' },
  { code: 'timeline.documents.manage', displayName: 'مدیریت اسناد فنی' },
  { code: 'timeline.checklists.read',  displayName: 'مشاهده چک‌لیست‌ها' },
  { code: 'timeline.checklists.manage',displayName: 'مدیریت چک‌لیست‌ها' },

  // --- قراردادهای حقوقی ---
  { code: 'legal-contracts.read',      displayName: 'مشاهده قراردادها' },
  { code: 'legal-contracts.create',    displayName: 'ایجاد قرارداد' },
  { code: 'legal-contracts.update',    displayName: 'ویرایش قرارداد' },
  { code: 'legal-contracts.cancel',    displayName: 'ابطال قرارداد' },
  { code: 'legal-contracts.parties.manage', displayName: 'مدیریت طرف‌های قرارداد' },

  // --- فروش ---
  { code: 'sales.units.read',          displayName: 'مشاهده واحدها' },
  { code: 'sales.units.manage',        displayName: 'مدیریت واحدها' },
  { code: 'sales.customers.read',      displayName: 'مشاهده مشتریان' },
  { code: 'sales.customers.manage',    displayName: 'مدیریت مشتریان' },
  { code: 'sales.contracts.read',      displayName: 'مشاهده قراردادهای فروش' },
  { code: 'sales.contracts.create',    displayName: 'ایجاد قرارداد فروش' },
  { code: 'sales.contracts.update',    displayName: 'ویرایش قرارداد فروش' },
  { code: 'sales.contracts.cancel',    displayName: 'ابطال قرارداد فروش' },
  { code: 'sales.payments.manage',     displayName: 'ثبت پرداخت فروش' },

  // --- داشبورد ---
  { code: 'dashboard.read',            displayName: 'مشاهده داشبورد' },

  // --- پشتیبان‌گیری و لاگ ---
  { code: 'backup.read',               displayName: 'مشاهده پشتیبان‌ها' },
  { code: 'backup.manage',             displayName: 'اجرای پشتیبان‌گیری و حذف' },
  { code: 'audit.read',                displayName: 'مشاهده لاگ تغییرات' },
  { code: 'audit.manage',              displayName: 'مدیریت و پاک‌سازی لاگ' },

  // --- اعلان‌ها ---
  { code: 'notification.read',         displayName: 'مشاهده اعلان‌ها' },
  { code: 'notification.manage',       displayName: 'مدیریت و پاک‌سازی اعلان‌ها' },

  // --- CRUD delete perms ---
  { code: 'adjustment.delete',         displayName: 'حذف تعدیل' },
  { code: 'materialpricediff.delete',  displayName: 'حذف اختلاف قیمت' },
  { code: 'attachment.delete',         displayName: 'حذف پیوست' },
  { code: 'capitalaccount.delete',     displayName: 'حذف حساب سرمایه' },
  { code: 'attendance.delete',         displayName: 'حذف حضور و غیاب' },
  { code: 'pettycashrequest.delete',   displayName: 'حذف درخواست تنخواه' },
  { code: 'rfq.delete',                displayName: 'حذف استعلام' },
  { code: 'supplierpayment.delete',    displayName: 'حذف پرداخت تأمین‌کننده' },
  { code: 'salesreceipt.delete',       displayName: 'حذف رسید فروش' },

  // --- ماشین‌آلات ---
  { code: 'equipment.read',            displayName: 'مشاهده ماشین‌آلات' },
  { code: 'equipment.create',          displayName: 'ایجاد ماشین' },
  { code: 'equipment.update',          displayName: 'ویرایش ماشین' },
  { code: 'equipment.delete',          displayName: 'حذف ماشین' },
  { code: 'equipment.logs.manage',     displayName: 'مدیریت کارکرد روزانه' },
  { code: 'equipment.maintenance.manage', displayName: 'مدیریت تعمیرات' },
  { code: 'price-list.read',           displayName: 'مشاهده فهرست بها' },
  { code: 'price-list.manage',         displayName: 'مدیریت فهرست بها' },

  // --- تسهیم سربار ---
  { code: 'overhead.read',             displayName: 'مشاهده تسهیم سربار' },
  { code: 'overhead.manage',           displayName: 'مدیریت تسهیم سربار' },
  { code: 'client-statement.read',     displayName: 'مشاهده صورت‌وضعیت کارفرما' },
  { code: 'client-statement.manage',   displayName: 'مدیریت صورت‌وضعیت کارفرما' },

  // --- WIP ---
  { code: 'wip.read',                  displayName: 'مشاهده کار در جریان ساخت' },

  // --- Data I/O ---
  { code: 'data-io.read',              displayName: 'خروج داده‌ها' },
  { code: 'data-io.manage',            displayName: 'ورود داده‌ها' },

  // --- گزارش مصرف مصالح ---
  { code: 'material-report.read',      displayName: 'گزارش مصرف مصالح و بهای واحد' },

  // --- تعدیل و مابه‌التفاوت ---
  { code: 'adjustment.read',           displayName: 'مشاهده تعدیل و مابه‌التفاوت' },
  { code: 'adjustment.manage',         displayName: 'مدیریت تعدیل و مابه‌التفاوت' },

  // --- گزارش‌های مالیاتی ---
  { code: 'tax-reports.read',          displayName: 'مشاهده گزارش‌های مالیاتی' },

  // --- گزارش‌های عملیاتی ---
  { code: 'operational-reports.read',  displayName: 'مشاهده گزارش‌های عملیاتی' },

  // --- permissionهای کشف‌شده در اسکن (Bug #2 fix) ---
  { code: 'settings.read',               displayName: 'مشاهده تنظیمات' },
  { code: 'settings.create',             displayName: 'ایجاد تنظیمات' },
  { code: 'settings.update',             displayName: 'ویرایش تنظیمات' },
  { code: 'settings.delete',             displayName: 'حذف تنظیمات' },
  { code: 'directory.read',              displayName: 'مشاهده دایرکتوری' },
  { code: 'directory.create',            displayName: 'ایجاد در دایرکتوری' },
  { code: 'directory.update',            displayName: 'ویرایش دایرکتوری' },
  { code: 'directory.delete',            displayName: 'حذف از دایرکتوری' },
  { code: 'expense.read',                displayName: 'مشاهده هزینه' },
  { code: 'expense.create',              displayName: 'ایجاد هزینه' },
  { code: 'expense.update',              displayName: 'ویرایش هزینه' },
  { code: 'expense.delete',              displayName: 'حذف هزینه' },
  { code: 'sales.read',                  displayName: 'مشاهده فروش' },
  { code: 'sales.create',                displayName: 'ایجاد فروش' },
  { code: 'sales.update',                displayName: 'ویرایش فروش' },
  { code: 'sales.delete',                displayName: 'حذف فروش' },
  { code: 'timeline.read',               displayName: 'مشاهده گاه‌شمار' },
  { code: 'timeline.create',             displayName: 'ایجاد در گاه‌شمار' },
  { code: 'timeline.update',             displayName: 'ویرایش گاه‌شمار' },
  { code: 'timeline.delete',             displayName: 'حذف از گاه‌شمار' },
  { code: 'warehouse.create',            displayName: 'ایجاد در انبار' },
  { code: 'warehouse.update',            displayName: 'ویرایش انبار' },
  { code: 'warehouse.delete',            displayName: 'حذف از انبار' },
  { code: 'procurement.delete',          displayName: 'حذف درخواست/سفارش' },
  { code: 'procurement.manage',          displayName: 'مدیریت کامل خرید' },
  { code: 'payroll.create',              displayName: 'ایجاد در حقوق' },
  { code: 'payroll.update',              displayName: 'ویرایش در حقوق' },
  { code: 'payroll.delete',              displayName: 'حذف از حقوق' },
  { code: 'petty-cash.update',           displayName: 'ویرایش تنخواه' },
  { code: 'petty-cash.delete',           displayName: 'حذف تنخواه' },
  { code: 'pettycashtransaction.delete', displayName: 'حذف تراکنش تنخواه' },
  { code: 'accounting.manage',           displayName: 'مدیریت کامل حسابداری' },
  { code: 'approvals.update',            displayName: 'ویرایش در کارتابل' },
  { code: 'attachment.read',             displayName: 'مشاهده پیوست' },
  { code: 'attachment.create',           displayName: 'ایجاد پیوست' },
  { code: 'bank.update',                 displayName: 'ویرایش بانک' },
  { code: 'contracts.activate',          displayName: 'فعال‌سازی قرارداد' },
  { code: 'contracts.cancel',            displayName: 'ابطال قرارداد' },
  { code: 'contracts.delete',            displayName: 'حذف قرارداد' },
  { code: 'overhead.update',             displayName: 'ویرایش تسهیم سربار' },
  { code: 'price-lists.update',          displayName: 'ویرایش فهرست بها' },
  { code: 'roles.update',                displayName: 'ویرایش نقش' },
  { code: 'site-ops.update',             displayName: 'ویرایش گزارش کارگاه' },
  { code: 'site-ops.delete',             displayName: 'حذف گزارش کارگاه' },
];

// ============================================================
// 2) ROLES — با لیست صریح permission codeها
// ============================================================
type RoleDef = {
  code: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  permissions: string[] | 'ALL';
};

const ROLES: RoleDef[] = [
  {
    code: 'super_admin',
    displayName: 'مدیر ارشد سیستم',
    description: 'دسترسی کامل به تمام ماژول‌ها و تنظیمات',
    isSystem: true,
    permissions: 'ALL',
  },
  {
    code: 'admin',
    displayName: 'مدیر سیستم',
    description: 'مدیریت کاربران، نقش‌ها و تنظیمات',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'users.read', 'users.create', 'users.update', 'users.delete',
      'roles.read', 'roles.manage',
      'backup.read', 'backup.manage',
      'audit.read', 'audit.manage',
      'notification.read', 'notification.manage',
      'data-io.read', 'data-io.manage',
      'inventory-count.read', 'inventory-count.manage',
      'warehouse-transfer.read', 'warehouse-transfer.manage',
    ],
  },
  {
    code: 'accountant',
    displayName: 'حسابدار',
    description: 'ثبت اسناد، گزارش‌های مالی، تنخواه و سرمایه شرکا',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'accounting.accounts.read', 'accounting.accounts.manage',
      'accounting.journals.read', 'accounting.journals.create',
      'accounting.journals.update', 'accounting.journals.reverse',
      'accounting.reports.read', 'accounting.fiscal-years.manage',
      'petty-cash.read', 'petty-cash.create',
      'partner-capital.read',
      'projects.read', 'contracts.read', 'budgets.read',
      'partners.read', 'partners.create', 'partners.update',
      'approvals.read',
      'inventory-count.read', 'warehouse-transfer.read',
    ],
  },
  {
    code: 'financial_manager',
    displayName: 'مدیر مالی',
    description: 'مدیریت امور مالی، حسابداری و پرسنلی',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'accounting.accounts.read', 'accounting.accounts.manage',
      'accounting.journals.read', 'accounting.journals.create',
      'accounting.journals.update', 'accounting.journals.reverse',
      'accounting.reports.read', 'accounting.fiscal-years.manage',
      'payroll.read', 'payroll.employees.manage', 'payroll.attendance.manage',
      'payroll.periods.manage', 'payroll.statements.manage', 'payroll.advance.manage',
      'partners.read', 'partners.create', 'partners.update',
      'partner-capital.read', 'partner-capital.manage',
      'approvals.read', 'approvals.approve', 'approvals.reject',
      'petty-cash.read', 'petty-cash.create', 'petty-cash.approve',
      'tax-reports.read',
      'projects.read', 'contracts.read', 'budgets.read',
      'inventory-count.read', 'warehouse-transfer.read',
    ],
  },
  {
    code: 'project_manager',
    displayName: 'مدیر پروژه',
    description: 'مدیریت پروژه‌ها، کارگاه و تدارکات',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'projects.read', 'projects.create', 'projects.update',
      'contracts.read', 'contracts.create', 'contracts.update',
      'wbs.read', 'wbs.manage',
      'budgets.read', 'budgets.manage',
      'timeline.permits.read', 'timeline.permits.manage',
      'timeline.insurances.read', 'timeline.insurances.manage',
      'timeline.guarantees.read', 'timeline.guarantees.manage',
      'timeline.documents.read', 'timeline.documents.manage',
      'timeline.checklists.read', 'timeline.checklists.manage',
      'site-ops.read', 'site-ops.create', 'site-ops.approve',
      'procurement.read', 'procurement.create', 'procurement.update',
      'approvals.read', 'approvals.approve', 'approvals.reject',
      'partners.read',
      'wip.read', 'client-statement.read',
    ],
  },
  {
    code: 'site_supervisor',
    displayName: 'سرپرست کارگاه',
    description: 'ثبت وقایع میدانی، حضور و غیاب و درخواست خرید',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'projects.read', 'wbs.read',
      'site-ops.read', 'site-ops.create', 'site-ops.approve',
      'procurement.read', 'procurement.create',
      'approvals.read',
      'warehouse.read', 'warehouse.receipts.manage', 'warehouse.issues.manage',
      'payroll.attendance.manage', 'payroll.advance.manage',
      'partners.read',
      'timeline.checklists.read', 'timeline.checklists.manage',
    ],
  },
  {
    code: 'warehouse_keeper',
    displayName: 'انباردار',
    description: 'مدیریت ورود و خروج کالا، موجودی، انبارگردانی و انتقال',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'warehouse.read',
      'warehouse.items.manage',
      'warehouse.receipts.manage',
      'warehouse.issues.manage',
      'warehouse.reports.read',
      'inventory-count.read', 'inventory-count.manage',
      'warehouse-transfer.read', 'warehouse-transfer.manage',
      'procurement.read',
      'projects.read',
    ],
  },
  {
    code: 'petty_cash_holder',
    displayName: 'تنخواه‌دار',
    description: 'مدیریت تنخواه و هزینه‌های جاری',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'petty-cash.read', 'petty-cash.create',
      'projects.read',
    ],
  },
  {
    code: 'procurement_officer',
    displayName: 'کارپرداز',
    description: 'خرید و تدارکات',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'procurement.read', 'procurement.create', 'procurement.update',
      'procurement.rfq.manage', 'procurement.po.manage',
      'warehouse.read',
      'projects.read',
      'partners.read', 'partners.create', 'partners.update',
      'approvals.read',
    ],
  },
  {
    code: 'hr',
    displayName: 'مدیر منابع انسانی',
    description: 'مدیریت پرسنل، حضور و غیاب و حقوق',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'payroll.read', 'payroll.employees.manage',
      'payroll.attendance.manage', 'payroll.periods.manage',
      'payroll.statements.manage', 'payroll.advance.manage',
      'partners.read', 'partners.create', 'partners.update',
      'projects.read',
    ],
  },
  {
    code: 'viewer',
    displayName: 'کاربر مشاهده‌گر',
    description: 'فقط مشاهده داده‌ها',
    isSystem: true,
    permissions: [
      'dashboard.read',
      'projects.read', 'partners.read', 'contracts.read',
      'accounting.accounts.read', 'accounting.journals.read', 'accounting.reports.read',
      'petty-cash.read', 'warehouse.read', 'procurement.read',
      'site-ops.read', 'payroll.read', 'partner-capital.read',
      'timeline.permits.read', 'timeline.insurances.read', 'timeline.guarantees.read',
      'timeline.documents.read', 'timeline.checklists.read',
      'legal-contracts.read', 'sales.units.read', 'sales.contracts.read', 'sales.customers.read',
      'inventory-count.read', 'warehouse-transfer.read',
      'wip.read', 'client-statement.read',
    ],
  },
];

// ============================================================
// 2.5) ROLE EXTRAS — permissionهای تکمیلی برای هر نقش
// (این‌ها در لیست اصلی ROLES نیستند ولی در کنترلرها استفاده می‌شوند)
// ============================================================
const ROLE_EXTRAS: Record<string, string[]> = {
  admin: [
    'settings.read', 'settings.create', 'settings.update', 'settings.delete',
    'roles.update', 'directory.read',
  ],
  financial_manager: [
    'settings.read', 'expense.read', 'expense.create', 'expense.update',
    'sales.read', 'sales.create', 'sales.update',
    'accounting.manage', 'bank.update',
    'contracts.activate', 'contracts.cancel', 'overhead.update',
    'payroll.create', 'payroll.update', 'petty-cash.update',
    'attachment.read', 'attachment.create', 'approvals.update', 'directory.read',
  ],
  accountant: [
    'settings.read', 'expense.read', 'expense.create',
    'sales.read', 'sales.create',
    'attachment.read', 'attachment.create', 'directory.read',
  ],
  project_manager: [
    'settings.read', 'timeline.read', 'timeline.create', 'timeline.update',
    'contracts.activate', 'contracts.cancel', 'directory.read', 'attachment.read',
  ],
  site_supervisor: [
    'settings.read', 'site-ops.update', 'attachment.read', 'attachment.create',
  ],
  warehouse_keeper: [
    'settings.read', 'warehouse.create', 'warehouse.update',
  ],
  procurement_officer: [
    'settings.read', 'procurement.manage', 'procurement.delete',
    'price-lists.update', 'attachment.read',
  ],
  petty_cash_holder: [
    'settings.read', 'petty-cash.update', 'expense.read', 'expense.create',
  ],
  hr: [
    'settings.read', 'payroll.create', 'payroll.update', 'attachment.read',
  ],
  viewer: [
    'settings.read', 'directory.read', 'sales.read', 'expense.read', 'attachment.read',
  ],
};

// ============================================================
// 3) USERS
// ============================================================
type UserDef = {
  username: string;
  fullName: string;
  email: string;
  mobile?: string;
  password: string;
  roleCode: string;
};

const USERS: UserDef[] = [
  {
    username: 'admin',
    fullName: 'مدیر ارشد سیستم',
    email: 'admin@epsay.local',
    password: 'Admin@1404',
    roleCode: 'super_admin',
  },
  {
    username: 'hassan',
    fullName: 'حسن جویانی',
    email: 'hassan@epsay.local',
    mobile: '09120000001',
    password: 'Partner@1404',
    roleCode: 'super_admin',
  },
  {
    username: 'mehdi',
    fullName: 'مهدی امینی',
    email: 'mehdi@epsay.local',
    mobile: '09120000002',
    password: 'Partner@1404',
    roleCode: 'super_admin',
  },
];

// ============================================================
// MAIN
// ============================================================
async function seedPermissions(): Promise<Map<string, string>> {
  console.log('\n[1/3] Seeding permissions...');
  let created = 0, updated = 0;
  const idByCode = new Map<string, string>();

  for (const p of PERMISSIONS) {
    const parts = p.code.split('.');
    const action = parts[parts.length - 1];
    const module = parts.slice(0, -1).join('.') || parts[0];

    const existing = await prisma.permission.findUnique({ where: { code: p.code } });
    const rec = await prisma.permission.upsert({
      where: { code: p.code },
      update: { displayName: p.displayName, module, action },
      create: { code: p.code, displayName: p.displayName, module, action },
    });
    idByCode.set(rec.code, rec.id);
    if (existing) updated++;
    else created++;
  }

  console.log(`  ✓ ${PERMISSIONS.length} permissions (created: ${created}, updated: ${updated})`);
  return idByCode;
}

async function seedRoles(permIdByCode: Map<string, string>): Promise<void> {
  console.log('\n[2/3] Seeding roles and assigning permissions...');

  const allPermIds = Array.from(permIdByCode.values());

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: {
        displayName: r.displayName,
        description: r.description,
      },
      create: {
        code: r.code,
        displayName: r.displayName,
        description: r.description,
        isSystem: r.isSystem,
      },
    });

    // تعیین permissionهای هدف (لیست صریح + extras)
    let targetIds: string[];
    const extras = ROLE_EXTRAS[r.code] || [];
    if (r.permissions === 'ALL') {
      targetIds = allPermIds;
    } else {
      targetIds = r.permissions
        .map((code) => permIdByCode.get(code))
        .filter((id): id is string => Boolean(id));

      // هشدار اگر کدی یافت نشد
      const missing = r.permissions.filter((c) => !permIdByCode.has(c));
      if (missing.length > 0) {
        console.log(`     ⚠ [${r.code}] missing codes: ${missing.join(', ')}`);
      }

      // اضافه کردن extras به targetIds
      const extraIds = extras
        .map((c) => permIdByCode.get(c))
        .filter((id): id is string => Boolean(id));
      targetIds = Array.from(new Set([...targetIds, ...extraIds]));
    }

    // حذف assignmentهای قبلی و درج جدیدها — داخل تراکنش
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: targetIds.map((pid) => ({ roleId: role.id, permissionId: pid })),
        skipDuplicates: true,
      }),
    ]);

    console.log(`  ✓ ${r.code.padEnd(20)} → ${targetIds.length} permissions`);
  }
}

async function seedUsers(): Promise<void> {
  console.log('\n[3/3] Seeding users...');
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        email: u.email,
        mobile: u.mobile ?? null,
        isActive: true,
        deletedAt: null,
      },
      create: {
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        mobile: u.mobile ?? null,
        passwordHash: hash(u.password),
        isActive: true,
      },
    });

    const role = await prisma.role.findUnique({ where: { code: u.roleCode } });
    if (!role) {
      console.log(`  ⚠ role "${u.roleCode}" not found — skipping user ${u.username}`);
      continue;
    }

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    console.log(`  ✓ ${u.username} (${u.roleCode})`);
  }
}

async function main(): Promise<void> {
  console.log('=============================================');
  console.log('  Epsay Accounting — Unified Seed');
  console.log('=============================================');

  const permIdByCode = await seedPermissions();
  await seedRoles(permIdByCode);
  await seedUsers();

  console.log('\n--- Summary ---');
  const pCount = await prisma.permission.count();
  const rCount = await prisma.role.count();
  const uCount = await prisma.user.count();
  const rpCount = await prisma.rolePermission.count();
  console.log(`  Permissions:      ${pCount}`);
  console.log(`  Roles:            ${rCount}`);
  console.log(`  Users:            ${uCount}`);
  console.log(`  Role-Permissions: ${rpCount}`);

  console.log('\n  Default credentials:');
  console.log('    admin  / Admin@1404');
  console.log('    hassan / Partner@1404');
  console.log('    mehdi  / Partner@1404');
  console.log('\n=============================================');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });