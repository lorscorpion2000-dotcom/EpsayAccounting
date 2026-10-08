import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Permission های جدید که باید بسازیم
const NEW_PERMS = [
  { code: 'accounting.journals.delete', module: 'accounting.journals', action: 'delete', displayName: 'حذف اسناد حسابداری' },
  { code: 'warehouse.items.delete', module: 'warehouse.items', action: 'delete', displayName: 'حذف کالا' },
  { code: 'payroll.work-logs.manage', module: 'payroll.work-logs', action: 'manage', displayName: 'مدیریت کارکرد روزانه' },
  { code: 'payroll.leave-requests.manage', module: 'payroll.leave-requests', action: 'manage', displayName: 'مدیریت مرخصیها' },
  { code: 'materialpricediff.read', module: 'materialpricediff', action: 'read', displayName: 'مشاهده مابهالتفاوت مصالح' },
];

// اضافه کن
for (const np of NEW_PERMS) {
  const existing = await p.permission.findUnique({ where: { code: np.code } });
  if (existing) { console.log('exists:', np.code); continue; }
  await p.permission.create({ data: np });
  console.log('created:', np.code);
}

// به نقشها اضافه کن
const ADDITIONS = {
  accountant: ['accounting.journals.delete'],
  warehouse_keeper: ['warehouse.items.delete'],
  site_supervisor: ['payroll.work-logs.manage', 'payroll.leave-requests.manage'],
  hr: ['payroll.work-logs.manage', 'payroll.leave-requests.manage'],
  project_manager: ['materialpricediff.read'],
  admin: NEW_PERMS.map(x => x.code),
  super_admin: NEW_PERMS.map(x => x.code),
};

const allPerms = await p.permission.findMany();
const byCode = new Map(allPerms.map(x => [x.code, x]));

for (const [roleCode, codes] of Object.entries(ADDITIONS)) {
  const role = await p.role.findUnique({ where: { code: roleCode } });
  if (!role) continue;
  const existing = await p.rolePermission.findMany({ where: { roleId: role.id } });
  const existingIds = new Set(existing.map(x => x.permissionId));

  const toAdd = [];
  for (const c of codes) {
    const perm = byCode.get(c);
    if (!perm) continue;
    if (existingIds.has(perm.id)) continue;
    toAdd.push({ roleId: role.id, permissionId: perm.id });
  }
  if (toAdd.length) {
    await p.rolePermission.createMany({ data: toAdd, skipDuplicates: true });
    console.log(roleCode + ': +' + toAdd.length);
  }
}

await p.$disconnect();
console.log('DONE');
