// ============================================================
// Epsay Accounting - Database Seed
// ============================================================
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MODULES: { code: string; nameFa: string }[] = [
  { code: 'dashboard',    nameFa: 'داشبورد مدیریتی' },
  { code: 'projects',     nameFa: 'پروژه‌ها و قراردادها' },
  { code: 'partners',     nameFa: 'شرکا و سرمایه‌گذاران' },
  { code: 'timeline',     nameFa: 'گاه‌شمار و مجوزها' },
  { code: 'accounting',   nameFa: 'حسابداری دوبل' },
  { code: 'directory',    nameFa: 'دایرکتوری اشخاص' },
  { code: 'petty-cash',   nameFa: 'تنخواه و هزینه‌های جاری' },
  { code: 'payroll',      nameFa: 'حقوق و دستمزد' },
  { code: 'site-ops',     nameFa: 'عملیات کارگاه' },
  { code: 'procurement',  nameFa: 'خرید و تدارکات' },
  { code: 'warehouse',    nameFa: 'انبارداری' },
  { code: 'approvals',    nameFa: 'کارتابل تاییدها' },
  { code: 'sales',        nameFa: 'فروش و پیش‌فروش' },
  { code: 'settings',     nameFa: 'تنظیمات' },
];

const ACTIONS: { code: string; nameFa: string }[] = [
  { code: 'create', nameFa: 'ایجاد' },
  { code: 'read',   nameFa: 'مشاهده' },
  { code: 'update', nameFa: 'ویرایش' },
  { code: 'delete', nameFa: 'حذف' },
];

async function seedPermissions() {
  console.log('\n[1/4] Creating permissions...');
  let count = 0;
  for (const m of MODULES) {
    for (const a of ACTIONS) {
      const code = `${m.code}.${a.code}`;
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          displayName: `${a.nameFa} ${m.nameFa}`,
          module: m.code,
          action: a.code,
        },
      });
      count++;
    }
  }
  console.log(`  ✓ ${count} permissions created`);
}

async function seedRoles() {
  console.log('\n[2/4] Creating roles...');

  const allPerms = await prisma.permission.findMany();
  const allIds = allPerms.map(p => p.id);
  const readOnly = allPerms.filter(p => p.action === 'read').map(p => p.id);

  const roles = [
    {
      code: 'super_admin',
      displayName: 'مدیر ارشد سیستم',
      description: 'دسترسی کامل به تمام ماژول‌ها و تنظیمات',
      permissions: allIds,
    },
    {
      code: 'admin',
      displayName: 'مدیر سیستم',
      description: 'مدیریت کاربران، نقش‌ها و تنظیمات',
      permissions: allIds.filter(id => {
        const p = allPerms.find(x => x.id === id);
        return p && (p.module === 'settings' || p.module === 'dashboard');
      }),
    },
    {
      code: 'financial_manager',
      displayName: 'مدیر مالی',
      description: 'مدیریت امور مالی، حسابداری و پرسنلی',
      permissions: allPerms
        .filter(p => ['accounting','payroll','partners','approvals','petty-cash','dashboard'].includes(p.module))
        .map(p => p.id),
    },
    {
      code: 'project_manager',
      displayName: 'مدیر پروژه',
      description: 'مدیریت پروژه‌ها، کارگاه و تدارکات',
      permissions: allPerms
        .filter(p => ['projects','timeline','site-ops','procurement','approvals','dashboard'].includes(p.module))
        .map(p => p.id),
    },
    {
      code: 'site_supervisor',
      displayName: 'سرپرست کارگاه',
      description: 'ثبت وقایع میدانی، حضور و غیاب و درخواست خرید',
      permissions: allPerms
        .filter(p => {
          if (p.module === 'dashboard' && p.action === 'read') return true;
          if (p.module === 'projects' && p.action === 'read') return true;
          if (p.module === 'site-ops') return true;
          if (p.module === 'procurement' && ['create','read'].includes(p.action)) return true;
          return false;
        })
        .map(p => p.id),
    },
    {
      code: 'warehouse_keeper',
      displayName: 'انباردار',
      description: 'مدیریت ورود و خروج کالا و موجودی',
      permissions: allPerms
        .filter(p => p.module === 'warehouse' || (p.module === 'dashboard' && p.action === 'read'))
        .map(p => p.id),
    },
    {
      code: 'petty_cash_holder',
      displayName: 'تنخواه‌دار',
      description: 'مدیریت تنخواه و هزینه‌های جاری',
      permissions: allPerms
        .filter(p => p.module === 'petty-cash' || (p.module === 'dashboard' && p.action === 'read'))
        .map(p => p.id),
    },
    {
      code: 'procurement_officer',
      displayName: 'کارپرداز',
      description: 'خرید و تدارکات',
      permissions: allPerms
        .filter(p => p.module === 'procurement' ||
                     (p.module === 'warehouse' && p.action === 'read') ||
                     (p.module === 'dashboard' && p.action === 'read'))
        .map(p => p.id),
    },
    {
      code: 'viewer',
      displayName: 'کاربر مشاهده‌گر',
      description: 'فقط مشاهده داده‌ها',
      permissions: readOnly,
    },
  ];

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { displayName: r.displayName, description: r.description },
      create: {
        code: r.code,
        displayName: r.displayName,
        description: r.description,
        isSystem: true,
      },
    });

    // پاک کردن مجوزهای قبلی و افزودن جدید
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: r.permissions.map(pid => ({ roleId: role.id, permissionId: pid })),
      skipDuplicates: true,
    });

    console.log(`  ✓ ${r.code} - ${r.permissions.length} permissions`);
  }
}

async function seedUsers() {
  console.log('\n[3/4] Creating users...');

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const users = [
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

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        mobile: u.mobile,
        passwordHash: hash(u.password),
        isActive: true,
      },
    });

    const role = await prisma.role.findUnique({ where: { code: u.roleCode } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    console.log(`  ✓ ${u.username} (${u.roleCode})`);
  }
}

async function main() {
  console.log('=============================================');
  console.log('  Epsay Accounting - Database Seed');
  console.log('=============================================');

  await seedPermissions();
  await seedRoles();
  await seedUsers();

  console.log('\n[4/4] Summary:');
  const pCount = await prisma.permission.count();
  const rCount = await prisma.role.count();
  const uCount = await prisma.user.count();
  console.log(`  Permissions : ${pCount}`);
  console.log(`  Roles       : ${rCount}`);
  console.log(`  Users       : ${uCount}`);

  console.log('\n=============================================');
  console.log('  Seed completed successfully!');
  console.log('=============================================');
  console.log('\n  Default credentials:');
  console.log('    admin  / Admin@1404');
  console.log('    hassan / Partner@1404');
  console.log('    mehdi  / Partner@1404');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });