// backend/scripts/patch-forward-materials-e2e-complete.mjs
import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.cwd(), 'test/e2e/forward-materials.e2e.test.ts');

if (!fs.existsSync(target)) {
  console.error('Target file not found:', target);
  process.exit(1);
}

let src = fs.readFileSync(target, 'utf8');

// 1. Fix prisma.item.create unit: 'NUMBER' -> unitId
if (src.includes("unit: 'NUMBER'")) {
  // We need to upsert unit first and use unitId
  const oldItemCreateBlock = `const createdItemId = (await prisma.item.create({
      data: {
        code: \`TEST-MAT-\${Date.now()}\`,
        name: 'آهن آلات تست',
        unit: 'NUMBER',
        warehouseId: createdWarehouseId,
      },
    })).id;`;

  const neworphicItemCreateBlock = `// Ensure unit exists
    const defaultUnit = await prisma.unit.upsert({
      where: { code: 'NUMBER' },
      update: {},
      create: { code: 'NUMBER', name: 'عدد' },
    });

    const createdItemId = (await prisma.item.create({
      data: {
        code: \`TEST-MAT-\${Date.now()}\`,
        name: 'آهن آلات تست',
        unitId: defaultUnit.id,
        warehouseId: createdWarehouseId,
      },
    })).id;`;

  if (src.includes(oldItemCreateBlock)) {
    src = src.replace(oldItemCreateBlock, neworphicItemCreateBlock);
    console.log('Successfully patched item creation with unitId.');
  } else {
    console.log('Item create block format differs slightly, replacing unit: \'NUMBER\' directly...');
    src = src.replace("unit: 'NUMBER'", "unitId: defaultUnit.id");
    // Insert defaultUnit upsert before item create
    src = src.replace(
      "const createdItemId = (await prisma.item.create({",
      `const defaultUnit = await prisma.unit.upsert({ where: { code: 'NUMBER' }, update: {}, create: { code: 'NUMBER', name: 'عدد' } });\n    const createdItemId = (await prisma.item.create({`
    );
  }
}

// 2. Ensure userProject is assigned to svUserId in before() so 403 scope checks pass
if (!src.includes('prisma.userProject.create')) {
  const targetSub = 'svUserId = sv.id;';
  const replacementSub = `svUserId = sv.id;
    await prisma.userProject.deleteMany({ where: { userId_projectId: { userId: sv.id, projectId } } });
    await prisma.userProject.create({ data: { userId: sv.id, projectId } });`;
  
  if (src.includes(targetSub)) {
    src = src.replace(targetSub, replacementSub);
    console.log('Added userProject assignment for SV user.');
  }
}

// 3. Ensure cleanup of userProject in after()
if (!src.includes('prisma.userProject.deleteMany({ where: { userId: svUserId } })')) {
  const targetAfter = 'await prisma.userRole.deleteMany({ where: { userId: svUserId } });';
  const replacementAfter = `await prisma.userProject.deleteMany({ where: { userId: svUserId } }).catch(() => {});
    await prisma.userRole.deleteMany({ where: { userId: svUserId } });`;
  
  if (src.includes(targetAfter)) {
    src = src.replace(targetAfter, replacementAfter);
    console.log('Added userProject cleanup in after().');
  }
}

fs.writeFileSync(target, src, 'utf8');
console.log('Complete patch applied to:', target);
