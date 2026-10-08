/* apply-fix53.js
 * 1) PostEventPayload: افزودن debitAccountId / creditAccountId
 * 2) AccountingEngine.resolveAccount: پشتیبانی از حساب صریح
 * 3) dump: چارت حساب‌ها + enumها
 */
const fs   = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const ROOT  = path.resolve(__dirname, '..');
const read  = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, c) => fs.writeFileSync(path.join(ROOT, p), c, 'utf8');

/* ══════════════ 1) DTO ══════════════ */
{
  const p = 'src/modules/accounting/engine/dto/post-event.dto.ts';
  let c = read(p).replace(/\r\n/g, '\n');
  if (c.includes('debitAccountId')) {
    console.log('   ✓ DTO: از قبل پچ شده');
  } else {
    const idx = c.lastIndexOf('}');
    const insert = `  // ─── explicit GL account override (بدون نیاز به detail) ───
  debitAccountId?: string;
  creditAccountId?: string;

`;
    c = c.slice(0, idx) + insert + c.slice(idx);
    write(p, c);
    console.log('   ✅ DTO: debitAccountId + creditAccountId اضافه شد');
  }
}

/* ══════════════ 2) Engine ══════════════ */
{
  const p = 'src/modules/accounting/engine/accounting-engine.service.ts';
  let c = read(p).replace(/\r\n/g, '\n');

  if (c.includes('loadExplicitAccount')) {
    console.log('   ✓ engine: از قبل پچ شده');
  } else {
    let patched = 0;

    const dRe = /const\s+debitAcc\s*=\s*await\s+this\.resolveAccount\(\s*mapping\.debitAccount,\s*payload,\s*payload\.debitDetailId,?\s*\);/m;
    if (dRe.test(c)) {
      c = c.replace(dRe, `const debitAcc = payload.debitAccountId
      ? await this.loadExplicitAccount(payload.debitAccountId)
      : await this.resolveAccount(mapping.debitAccount, payload, payload.debitDetailId);`);
      patched++;
    }

    const cRe = /const\s+creditAcc\s*=\s*await\s+this\.resolveAccount\(\s*mapping\.creditAccount,\s*payload,\s*payload\.creditDetailId,?\s*\);/m;
    if (cRe.test(c)) {
      c = c.replace(cRe, `const creditAcc = payload.creditAccountId
      ? await this.loadExplicitAccount(payload.creditAccountId)
      : await this.resolveAccount(mapping.creditAccount, payload, payload.creditDetailId);`);
      patched++;
    }

    const mAnchor = /(\n\s*private\s+async\s+resolveAccount\s*\()/;
    if (mAnchor.test(c)) {
      c = c.replace(mAnchor, `
  private async loadExplicitAccount(id: string) {
    const acc = await this.prisma.account.findUnique({ where: { id } });
    if (!acc || !acc.isActive || !acc.isPostable) {
      throw new BadRequestException(
        \`Explicit account \${id} is not usable for posting\`,
      );
    }
    return acc;
  }
$1`);
      console.log(`   ✅ engine: method اضافه شد (calls patched: ${patched}/2)`);
    } else {
      console.log(`   ⚠ engine: anchor resolveAccount پیدا نشد (calls patched: ${patched}/2)`);
    }

    write(p, c);
  }
}

/* ══════════════ 3) Dump ══════════════ */
async function dump() {
  const prisma = new PrismaClient();
  try {
    const accounts = await prisma.$queryRawUnsafe(
      `SELECT code, name, level, nature, is_postable AS postable, detail_type AS dtype
       FROM accounts ORDER BY code`
    );
    console.log('\n📋 Chart of accounts:');
    console.table(accounts);

    const types = await prisma.$queryRawUnsafe(
      `SELECT t.typname, e.enumlabel FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typname IN ('AccountType','AccountLevel','AccountNature','AccountDetailType')
       ORDER BY t.typname, e.enumsortorder`
    );
    console.log('\n📋 enum values:');
    for (const row of types) console.log(`   ${row.typname}: ${row.enumlabel}`);
  } finally {
    await prisma.$disconnect();
  }
}

dump().catch(e => console.error('dump err:', e.message));