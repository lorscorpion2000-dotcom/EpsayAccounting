/* apply-fix43.js — پچ‌های fix43 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROOT = path.resolve(__dirname, '..');
const read  = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, c) => fs.writeFileSync(path.join(ROOT, p), c, 'utf8');

async function main() {
  /* ---------- 0) گزارش تفصیل‌ها ---------- */
  console.log('🔎 تفصیل‌های زیر 1.1.1:');
  const d1 = await prisma.$queryRawUnsafe(
    `SELECT code, name, "detailType", "detailId" FROM accounts
     WHERE "parentId" = (SELECT id FROM accounts WHERE code='1.1.1')`
  );
  console.table(d1);
  console.log('🔎 تفصیل‌های زیر 2.1.5:');
  const d2 = await prisma.$queryRawUnsafe(
    `SELECT code, name, "detailType", "detailId" FROM accounts
     WHERE "parentId" = (SELECT id FROM accounts WHERE code='2.1.5')`
  );
  console.table(d2);

  /* ---------- 1) post-event.dto.ts ---------- */
  {
    const p = 'src/modules/accounting/engine/dto/post-event.dto.ts';
    let dto = read(p);

    // اطمینان از importهای لازم
    const importMatch = dto.match(/import\s*\{([^}]+)\}\s*from\s*['"]class-validator['"]/);
    if (importMatch) {
      const names = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      const need = [];
      if (!names.includes('IsOptional')) need.push('IsOptional');
      if (!names.includes('IsString'))   need.push('IsString');
      if (need.length) {
        const newImport = `import { ${[...names, ...need].join(', ')} } from 'class-validator';`;
        dto = dto.replace(importMatch[0], newImport);
        console.log('   ✅ DTO: import تکمیل شد');
      }
    } else {
      dto = `import { IsOptional, IsString } from 'class-validator';\n` + dto;
      console.log('   ✅ DTO: import اضافه شد');
    }

    if (dto.includes('bankAccountId')) {
      console.log('   ✓ DTO: bankAccountId از قبل هست');
    } else {
      const lastBrace = dto.lastIndexOf('}');
      dto = dto.slice(0, lastBrace) +
        '  @IsOptional() @IsString() bankAccountId?: string;\n' +
        '  @IsOptional() @IsString() pettyCashId?: string;\n' +
        '}\n';
      console.log('   ✅ DTO: فیلدهای bankAccountId/pettyCashId اضافه شد');
    }
    write(p, dto);
  }

  /* ---------- 2) accounting-engine.service.ts ---------- */
  {
    const p = 'src/modules/accounting/engine/accounting-engine.service.ts';
    let c = read(p).replace(/\r\n/g, '\n');

    const from = `      const hints: Array<string | undefined> = [
        ctx.partnerId,
      ].filter(Boolean) as string[];`;
    const to = `      const hints: Array<string | undefined> = [
        ctx.partnerId,
        (ctx as any).bankAccountId,
        (ctx as any).pettyCashId,
        (ctx as any).salesCustomerId,
      ].filter(Boolean) as string[];`;

    if (c.includes('(ctx as any).bankAccountId')) {
      console.log('   ✓ engine: hints از قبل پچ شده');
    } else if (c.includes(from)) {
      write(p, c.replace(from, to));
      console.log('   ✅ engine: hints پچ شد');
    } else {
      console.log('   ⚠ engine: الگوی hints پیدا نشد — دستی باید بررسی شود');
    }
  }

  /* ---------- 3) cheques.service.ts ---------- */
  {
    const p = 'src/modules/bank/cheques.service.ts';
    let c = read(p).replace(/\r\n/g, '\n');
    let changed = false;

    const cFrom = `        partnerId: created.partnerId ?? undefined,
        projectId: created.projectId ?? undefined,`;
    const cTo = `        partnerId: created.partnerId ?? undefined,
        bankAccountId: created.bankAccountId ?? undefined,
        projectId: created.projectId ?? undefined,`;

    const sFrom = `      partnerId: c.partnerId ?? undefined,
      projectId: c.projectId ?? undefined,`;
    const sTo = `      partnerId: c.partnerId ?? undefined,
      bankAccountId: c.bankAccountId ?? undefined,
      projectId: c.projectId ?? undefined,`;

    if (c.includes('bankAccountId: created.bankAccountId')) {
      console.log('   ✓ cheques.create: از قبل پچ شده');
    } else if (c.includes(cFrom)) {
      c = c.replace(cFrom, cTo); changed = true;
      console.log('   ✅ cheques.create: پچ شد');
    } else {
      console.log('   ⚠ cheques.create: الگو پیدا نشد');
    }

    if (c.includes('bankAccountId: c.bankAccountId')) {
      console.log('   ✓ cheques.settle: از قبل پچ شده');
    } else if (c.includes(sFrom)) {
      c = c.replace(sFrom, sTo); changed = true;
      console.log('   ✅ cheques.settle: پچ شد');
    } else {
      console.log('   ⚠ cheques.settle: الگو پیدا نشد');
    }

    if (changed) write(p, c);
  }

  /* ---------- 4) test-bank-hook.js ---------- */
  {
    const p = 'scripts/test-bank-hook.js';
    let c = read(p).replace(/\r\n/g, '\n');

    if (c.includes('matches(d, expectedDebit)')) {
      console.log('   ✓ test: از قبل پچ شده');
    } else {
      const from = `  for (const je of jes) {
    const d = je.lines.filter(l => Number(l.debit)  > 0).map(l => l.account.code);
    const c = je.lines.filter(l => Number(l.credit) > 0).map(l => l.account.code);
    if (d.includes(expectedDebit) && c.includes(expectedCredit)) {`;
      const to = `  const matches = (codes, want) =>
    codes.some(code => code === want || code.startsWith(want + '.'));
  for (const je of jes) {
    const d = je.lines.filter(l => Number(l.debit)  > 0).map(l => l.account.code);
    const c = je.lines.filter(l => Number(l.credit) > 0).map(l => l.account.code);
    if (matches(d, expectedDebit) && matches(c, expectedCredit)) {`;
      if (c.includes(from)) {
        write(p, c.replace(from, to));
        console.log('   ✅ test: prefix matching پچ شد');
      } else {
        console.log('   ⚠ test: الگوی expectJE پیدا نشد');
      }
    }
  }

  console.log('\n🎉 apply-fix43 تمام شد');
}

main()
  .catch(e => { console.error('💥', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());