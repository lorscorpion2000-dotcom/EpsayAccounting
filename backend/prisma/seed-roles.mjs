import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// [code, displayName, description, permissionCodes (اختیاری — همه اگر null)]
const ROLES = [
  {
    code: 'admin',
    displayName: 'مدیر سیستم',
    description: 'دسترسی کامل به همه بخش‌های سیستم',
    permissions: null, // همه
    isSystem: true,
  },
  {
    code: 'accountant',
    displayName: 'حسابدار',
    description: 'دسترسی به حسابداری، گزارشات مالی و اسناد',
    permissions: [
      'dashboard.read',
      'accounting.accounts.read', 'accounting.accounts.manage',
      'accounting.journals.read', 'accounting.journals.create', 'accounting.journals.update', 'accounting.journals.reverse',
      'accounting.reports.read', 'accounting.fiscal-years.manage',
      'petty-cash.read', 'petty-cash.create',
      'partner-capital.read',
      'projects.read', 'contracts.read', 'budgets.read',
      'partners.read', 'partners.create', 'partners.update',,
      'attachment.read', 'attachment.create',],
  },
  {
    code: 'warehouse_keeper',
    displayName: 'انباردار',
    description: 'مدیریت انبار، رسید و حواله',
    permissions: [
      'dashboard.read',
      'warehouse.read',
      'warehouse.items.manage',
      'warehouse.receipts.manage',
      'warehouse.issues.manage',
      'warehouse.reports.read',
      'procurement.read',
      'projects.read',,
      'attachment.read', 'attachment.create',],
  },
  {
    code: 'purchaser',
    displayName: 'کارپرداز',
    description: 'مدیریت دستورات خرید و درخواست‌های خرید',
    permissions: [
      'dashboard.read',
      'procurement.read', 'procurement.create', 'procurement.update',
      'procurement.rfq.manage', 'procurement.po.manage',
      'warehouse.read',
      'projects.read',
      'partners.read',
      'approvals.read',,
      'attachment.read', 'attachment.create',],
  },
  {
    code: 'site_supervisor',
    displayName: 'سرپرست کارگاه',
    description: 'ثبت گزارش روزانه و مدیریت کارگاه',
    permissions: [
      'dashboard.read',
      'site-ops.read', 'site-ops.create', 'site-ops.approve',
      'projects.read', 'wbs.read',
      'warehouse.read',
      'payroll.attendance.manage', 'payroll.advance.manage',
      'partners.read',,
      'attachment.read', 'attachment.create',],
  },
  {
    code: 'hr',
    displayName: 'منابع انسانی',
    description: 'مدیریت پرسنل، حضور و غیاب و حقوق',
    permissions: [
      'dashboard.read',
      'payroll.read', 'payroll.employees.manage',
      'payroll.attendance.manage', 'payroll.periods.manage',
      'payroll.statements.manage', 'payroll.advance.manage',
      'partners.read', 'partners.create', 'partners.update',
      'projects.read',,
      'attachment.read', 'attachment.create',],
  },
  {
    code: 'project_manager',
    displayName: 'مدیر پروژه',
    description: 'مدیریت پروژه‌ها، قراردادها و بودجه',
    permissions: [
      'dashboard.read',
      'projects.read', 'projects.create', 'projects.update',
      'contracts.read', 'contracts.create', 'contracts.update',
      'wbs.read', 'wbs.manage',
      'budgets.read', 'budgets.manage',
      'partners.read',
      'partner-capital.read',
      'approvals.read', 'approvals.approve', 'approvals.reject',
      'timeline.checklists.read', 'timeline.checklists.manage',,
      'attachment.read', 'attachment.create',],
  },
  {
    code: 'approver',
    displayName: 'تأییدکننده',
    description: 'فقط تأیید یا رد اسناد در کارتابل',
    permissions: [
      'dashboard.read',
      'approvals.read', 'approvals.approve', 'approvals.reject',,
      'attachment.read',],
  },
  {
    code: 'viewer',
    displayName: 'فقط مشاهده',
    description: 'دسترسی فقط-خواندن به همه بخش‌ها',
    permissions: [
      'dashboard.read',
      'projects.read', 'partners.read', 'contracts.read',
      'accounting.accounts.read', 'accounting.journals.read', 'accounting.reports.read',
      'petty-cash.read', 'warehouse.read', 'procurement.read',
      'site-ops.read', 'payroll.read', 'partner-capital.read',
      'timeline.permits.read', 'timeline.insurances.read', 'timeline.guarantees.read',
      'timeline.documents.read', 'timeline.checklists.read',
      'legal-contracts.read', 'sales.units.read', 'sales.contracts.read', 'sales.customers.read',,
      'attachment.read',],
  },
];

async function main() {
  console.log('=== Seeding roles ===\n');

  const allPerms = await prisma.permission.findMany();
  const permByCode = new Map(allPerms.map((p) => [p.code, p.id]));

  let created = 0;
  let updated = 0;

  for (const r of ROLES) {
    let role = await prisma.role.findFirst({ where: { code: r.code } });

    if (!role) {
      role = await prisma.role.create({
        data: {
          code: r.code,
          displayName: r.displayName,
          description: r.description,
          isSystem: r.isSystem || false,
        },
      });
      created++;
      console.log('[NEW] ' + r.code + ' — ' + r.displayName);
    } else {
      // Update name/description if changed
      await prisma.role.update({
        where: { id: role.id },
        data: {
          displayName: r.displayName,
          description: r.description,
        },
      });
      updated++;
      console.log('[UPD] ' + r.code);
    }

    // Determine permissions to assign
    const targetCodes = r.permissions === null
      ? allPerms.map((p) => p.code)
      : r.permissions;

    const targetIds = targetCodes
      .map((c) => permByCode.get(c))
      .filter(Boolean);

    // Remove all existing assignments
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    // Add new
    for (const pid of targetIds) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: pid },
      });
    }
    console.log('     → ' + targetIds.length + ' مجوز');
  }

  console.log('');
  console.log('=========================================');
  console.log('  Created: ' + created);
  console.log('  Updated: ' + updated);
  console.log('  Total roles: ' + ROLES.length);
  console.log('=========================================');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());