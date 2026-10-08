import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const sa = await prisma.role.findUnique({ where: { code: 'super_admin' } });
if (sa) {
  console.log('super_admin already exists');
} else {
  const allPerms = await prisma.permission.findMany();
  const created = await prisma.role.create({
    data: {
      code: 'super_admin',
      name: 'مدیر ارشد سیستم',
      displayName: 'مدیر ارشد سیستم',
      description: 'دسترسی کامل بدون محدودیت',
    },
  });
  await prisma.rolePermission.createMany({
    data: allPerms.map(p => ({ roleId: created.id, permissionId: p.id })),
  });
  console.log('Created super_admin with', allPerms.length, 'permissions');
}

await prisma.$disconnect();
console.log('DONE');
