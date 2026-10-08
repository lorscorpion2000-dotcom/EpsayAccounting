import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// ====== نقشهی مجوزهای اضافی برای هر نقش ======
const ADDITIONS = {
  accountant: [
    'accounting.journals.delete',
    'journal.delete', 'journal.view-deletions',
    'petty-cash.approve', 'petty-cash.update',
    'pettycashrequest.delete', 'pettycashtransaction.delete',
    'supplierpayment.delete', 'salesreceipt.delete',
    'attachment.delete',
    'materialpricediff.delete', 'adjustment.delete',
    'legal-contracts.read',
    'budgets.read', 'budgets.manage',
    'payroll.read',
    'procurement.read',
    'sales.contracts.read', 'sales.customers.read', 'sales.units.read',
    'sales.customers.manage',
  ],
  warehouse_keeper: [
    'warehouse.delete', 'warehouse.create', 'warehouse.update',
    'warehouse.items.manage', 'warehouse.items.delete',
    'material-report.read',
    'equipment.read',
    'procurement.read',
    'warehouse-transfer.manage',
    'inventory-count.manage',
    'site-ops.read',
  ],
  site_supervisor: [
    'site-ops.update', 'site-ops.delete', 'site-ops.create',
    'equipment.logs.manage', 'equipment.maintenance.manage',
    'equipment.read',
    'payroll.attendance.manage', 'payroll.work-logs.manage', 'payroll.leave-requests.manage',
    'wbs.read', 'wbs.manage',
    'warehouse.items.manage',
    'inventory-count.manage', 'inventory-count.read',
  ],
  hr: [
    'payroll.employees.manage', 'payroll.periods.manage', 'payroll.statements.manage',
    'payroll.leave-requests.manage', 'payroll.work-logs.manage', 'payroll.advance.manage',
    'payroll.attendance.manage',
    'partners.create', 'partners.update', 'partners.read',
    'legal-contracts.read', 'legal-contracts.parties.manage',
    'timeline.documents.read',
    'users.read',
  ],
  project_manager: [
    'procurement.read', 'procurement.create', 'procurement.update',
    'warehouse.read',
    'equipment.maintenance.manage',
    'site-ops.update', 'site-ops.delete', 'site-ops.create',
    'payroll.read',
    'timeline.permits.manage', 'timeline.permits.read',
    'timeline.insurances.manage', 'timeline.insurances.read',
    'timeline.documents.manage', 'timeline.documents.read',
    'timeline.guarantees.manage', 'timeline.guarantees.read',
    'timeline.checklists.manage', 'timeline.checklists.read',
    'material-report.read',
    'inventory-count.read',
    'sales.contracts.read', 'sales.customers.read', 'sales.units.read',
    'materialpricediff.read',
    'legal-contracts.read',
    'wip.read',
  ],
  approver: [
    'procurement.read',
    'warehouse.read',
    'payroll.read',
    'material-report.read',
    'inventory-count.read',
    'budgets.read',
    'projects.read',
    'dashboard.read',
  ],
  purchaser: [
    'procurement.delete', 'procurement.manage',
    'warehouse.items.manage',
    'partners.create', 'partners.update',
    'material-report.read',
    'equipment.read',
    'price-list.read',
    'projects.read',
  ],
  pettywork: [
    'petty-cash.approve',
    'material-report.read',
    'dashboard.read',
    'equipment.read',
  ],
};

// ====== اعمال ======
const allPerms = await p.permission.findMany();
const permByCode = new Map(allPerms.map(x => [x.code, x]));

let totalAdded = 0;
const notFound = [];

for (const [roleCode, addCodes] of Object.entries(ADDITIONS)) {
  const role = await p.role.findUnique({ where: { code: roleCode } });
  if (!role) { console.log('Role not found:', roleCode); continue; }

  const existing = await p.rolePermission.findMany({ where: { roleId: role.id } });
  const existingIds = new Set(existing.map(x => x.permissionId));

  const toAdd = [];
  for (const code of addCodes) {
    const perm = permByCode.get(code);
    if (!perm) { notFound.push(roleCode + ' → ' + code); continue; }
    if (existingIds.has(perm.id)) continue;
    toAdd.push({ roleId: role.id, permissionId: perm.id });
  }

  if (toAdd.length > 0) {
    await p.rolePermission.createMany({ data: toAdd, skipDuplicates: true });
    totalAdded += toAdd.length;
    console.log('Role ' + roleCode + ': added ' + toAdd.length + ' permissions');
  } else {
    console.log('Role ' + roleCode + ': already up to date');
  }
}

if (notFound.length) {
  console.log('\n⚠️ Permission codes not found in DB (skipped):');
  for (const x of notFound) console.log('  - ' + x);
}

console.log('\nTotal permissions added:', totalAdded);

// خلاصه نهایی
console.log('\n=== Summary after update ===');
const roles = await p.role.findMany({
  include: { _count: { select: { permissions: true } } },
  orderBy: { code: 'asc' },
});
for (const r of roles) console.log(r.code.padEnd(20), '|', r._count.permissions, 'perms');

await p.$disconnect();
