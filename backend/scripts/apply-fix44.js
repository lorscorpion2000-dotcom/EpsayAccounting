/* apply-fix44.js â€” Ù¾Ú†â€ŒÙ‡Ø§ÛŒ fix44 (Ø§ØµÙ„Ø§Ø­ Ù†Ø§Ù… Ø³ØªÙˆÙ†â€ŒÙ‡Ø§ + Ù¾Ú† Ú©Ø¯) */
const fs   = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROOT  = path.resolve(__dirname, '..');
const read  = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, c) => fs.writeFileSync(path.join(ROOT, p), c, 'utf8');

async function reportColumnNames() {
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name='accounts' ORDER BY ordinal_position`
  );
  console.log('ðŸ“‹ Ø³ØªÙˆÙ†â€ŒÙ‡Ø§ÛŒ Ø¬Ø¯ÙˆÙ„ accounts:');
  console.log('   ', cols.map(c => c.column_name).join(', '));
}

async function reportDetails(parentCode) {
  // Ù†Ø§Ù… Ø³ØªÙˆÙ†â€ŒÙ‡Ø§ Ø±Ùˆ Ø¯Ø§ÛŒÙ†Ø§Ù…ÛŒÚ© Ù¾ÛŒØ¯Ø§ Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ…
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name='accounts'`
  );
  const set = new Set(cols.map(c => c.column_name));
  const detailIdCol   = set.has('detail_id')   ? '"detail_id"'   : '"detailId"';
  const detailTypeCol = set.has('detail_type') ? '"detail_type"' : '"detailType"';
  const parentIdCol   = set.has('parent_id')   ? '"parent_id"'   : '"parentId"';

  const rows = await prisma.$queryRawUnsafe(
    `SELECT code, name, ${detailTypeCol} AS dtype, ${detailIdCol} AS did
     FROM accounts
     WHERE ${parentIdCol} = (SELECT id FROM accounts WHERE code = $1)`,
    parentCode
  );
  console.log(`ðŸ“‹ ØªÙØµÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ø²ÛŒØ± ${parentCode}:`);
  if (!rows.length) console.log('   (Ù‡ÛŒÚ†)');
  else console.table(rows);
}

async function main() {
  await reportColumnNames();
  await reportDetails('1.1.1');
  await reportDetails('2.1.5');
  await reportDetails('1.1.2');
  await reportDetails('2.1.6');
  await reportDetails('1.1.6');

  /* ---------- 1) post-event.dto.ts ---------- */
  {
    const p = 'src/modules/accounting/engine/dto/post-event.dto.ts';
    let dto = read(p);
    let changed = false;

    if (!dto.match(/from ['"]class-validator['"]/)) {
      dto = `import { IsOptional, IsString } from 'class-validator';\n` + dto;
      changed = true;
    } else {
      const m = dto.match(/import\s*\{([^}]+)\}\s*from\s*['"]class-validator['"]/);
      const names = m[1].split(',').map(s => s.trim()).filter(Boolean);
      const need = [];
      if (!names.includes('IsOptional')) need.push('IsOptional');
      if (!names.includes('IsString'))   need.push('IsString');
      if (need.length) {
        dto = dto.replace(m[0], `import { ${[...names, ...need].join(', ')} } from 'class-validator';`);
        changed = true;
      }
    }

    if (!dto.includes('bankAccountId?')) {
      const closeIdx = dto.lastIndexOf('}');
      dto = dto.slice(0, closeIdx)
        + '  @IsOptional() @IsString() bankAccountId?: string;\n'
        + '  @IsOptional() @IsString() pettyCashId?: string;\n'
        + '}\n';
      changed = true;
    }
    write(p, dto);
    console.log(`   ${changed ? 'âœ…' : 'âœ“'} DTO: ${changed ? 'Ù¾Ú† Ø´Ø¯' : 'Ø§Ø² Ù‚Ø¨Ù„ Ø¯Ø±Ø³Øª'}`);
  }

  /* ---------- 2) engine resolveAccount hints ---------- */
  {
    const p = 'src/modules/accounting/engine/accounting-engine.service.ts';
    let c = read(p).replace(/\r\n/g, '\n');

    if (c.includes('(ctx as any).bankAccountId')) {
      console.log('   âœ“ engine: Ø§Ø² Ù‚Ø¨Ù„ Ù¾Ú† Ø´Ø¯Ù‡');
    } else {
      // Ú†Ù†Ø¯ Ø§Ù„Ú¯Ùˆ Ø±Ùˆ Ø§Ù…ØªØ­Ø§Ù† Ú©Ù†
      const patterns = [
        {
          from: `      const hints: Array<string | undefined> = [\n        ctx.partnerId,\n      ].filter(Boolean) as string[];`,
          to:   `      const hints: Array<string | undefined> = [\n        ctx.partnerId,\n        (ctx as any).bankAccountId,\n        (ctx as any).pettyCashId,\n        (ctx as any).salesCustomerId,\n      ].filter(Boolean) as string[];`
        },
        {
          from: `const hints: Array<string | undefined> = [\n        ctx.partnerId,\n      ].filter(Boolean)`,
          to:   `const hints: Array<string | undefined> = [\n        ctx.partnerId,\n        (ctx as any).bankAccountId,\n        (ctx as any).pettyCashId,\n        (ctx as any).salesCustomerId,\n      ].filter(Boolean)`
        },
        {
          from: `const hints = [ctx.partnerId].filter(Boolean)`,
          to:   `const hints = [ctx.partnerId, (ctx as any).bankAccountId, (ctx as any).pettyCashId, (ctx as any).salesCustomerId].filter(Boolean)`
        },
      ];
      let patched = false;
      for (const { from, to } of patterns) {
        if (c.includes(from)) { c = c.replace(from, to); patched = true; break; }
      }
      if (patched) {
        write(p, c);
        console.log('   âœ… engine: hints Ù¾Ú† Ø´Ø¯');
      } else {
        // Ú¯Ø²Ø§Ø±Ø´ ØªÚ©Ù‡â€ŒÛŒ hints Ø¨Ø±Ø§ÛŒ Ø¯ÛŒØ¨Ø§Ú¯
        const idx = c.indexOf('hints');
        if (idx >= 0) {
          console.log('   âš  engine: Ø§Ù„Ú¯Ùˆ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯ â€” Ø¨Ø®Ø´ÛŒ Ø§Ø² ÙØ§ÛŒÙ„:');
          console.log(c.slice(Math.max(0, idx - 200), idx + 500));
        } else {
          console.log('   âš  engine: Ú©Ù„Ù…Ù‡â€ŒÛŒ hints Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯');
        }
      }
    }
  }

  /* ---------- 3) cheques.service.ts ---------- */
  {
    const p = 'src/modules/bank/cheques.service.ts';
    let c = read(p).replace(/\r\n/g, '\n');
    let changed = false;

    // create()
    if (!c.includes('bankAccountId: created.bankAccountId')) {
      const variants = [
        `        partnerId: created.partnerId ?? undefined,\n        projectId: created.projectId ?? undefined,`,
        `        partnerId: created.partnerId ?? undefined,\n        projectId: created.projectId ?? undefined`
      ];
      for (const v of variants) {
        if (c.includes(v)) {
          c = c.replace(v, v.replace(
            `partnerId: created.partnerId ?? undefined,`,
            `partnerId: created.partnerId ?? undefined,\n        bankAccountId: created.bankAccountId ?? undefined,`
          ));
          changed = true;
          console.log('   âœ… cheques.create: Ù¾Ú† Ø´Ø¯');
          break;
        }
      }
      if (!changed) console.log('   âš  cheques.create: Ø§Ù„Ú¯Ùˆ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯');
    } else console.log('   âœ“ cheques.create: Ø§Ø² Ù‚Ø¨Ù„ Ù¾Ú† Ø´Ø¯Ù‡');

    // settle()
    if (!c.includes('bankAccountId: c.bankAccountId')) {
      const from = `      partnerId: c.partnerId ?? undefined,\n      projectId: c.projectId ?? undefined,`;
      if (c.includes(from)) {
        c = c.replace(from, from.replace(
          `partnerId: c.partnerId ?? undefined,`,
          `partnerId: c.partnerId ?? undefined,\n      bankAccountId: c.bankAccountId ?? undefined,`
        ));
        changed = true;
        console.log('   âœ… cheques.settle: Ù¾Ú† Ø´Ø¯');
      } else console.log('   âš  cheques.settle: Ø§Ù„Ú¯Ùˆ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯');
    } else console.log('   âœ“ cheques.settle: Ø§Ø² Ù‚Ø¨Ù„ Ù¾Ú† Ø´Ø¯Ù‡');

    if (changed) write(p, c);
  }

  /* ---------- 4) test-bank-hook.js ---------- */
  {
    const p = 'scripts/test-bank-hook.js';
    let c = read(p).replace(/\r\n/g, '\n');

    if (c.includes('const matches =')) {
      console.log('   âœ“ test: Ø§Ø² Ù‚Ø¨Ù„ Ù¾Ú† Ø´Ø¯Ù‡');
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
        console.log('   âœ… test: prefix matching Ù¾Ú† Ø´Ø¯');
      } else {
        // fallback: ÙÙ‚Ø· ØªØ§Ø¨Ø¹ matches Ø±Ùˆ Ø§Ø¶Ø§ÙÙ‡ Ú©Ù† Ù‚Ø¨Ù„ Ø§Ø² for
        if (c.includes('if (d.includes(expectedDebit) && c.includes(expectedCredit))')) {
          const f2 = `  for (const je of jes) {`;
          const t2 = `  const matches = (codes, want) =>
    codes.some(code => code === want || code.startsWith(want + '.'));
  for (const je of jes) {`;
          c = c.replace(f2, t2);
          c = c.replace('if (d.includes(expectedDebit) && c.includes(expectedCredit))',
                        'if (matches(d, expectedDebit) && matches(c, expectedCredit))');
          write(p, c);
          console.log('   âœ… test: prefix matching Ù¾Ú† Ø´Ø¯ (fallback)');
        } else {
          console.log('   âš  test: Ø§Ù„Ú¯Ùˆ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯');
        }
      }
    }
  }

  console.log('\nðŸŽ‰ apply-fix44 ØªÙ…Ø§Ù… Ø´Ø¯');
}

main()
  .catch(e => { console.error('ðŸ’¥', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
