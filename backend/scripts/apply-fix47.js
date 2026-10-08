/* apply-fix47.js */
const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const read  = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, c) => fs.writeFileSync(path.join(ROOT, p), c, 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

/* ---------- 1) post-event.dto.ts (بازگرداندن به interface) ---------- */
{
  const p = 'src/modules/accounting/engine/dto/post-event.dto.ts';
  const clean = `export interface PostEventPayload {
  amount: number | string;
  entryDate: string | Date;
  description?: string;
  reference?: string;

  // ─── context for auto-resolve ───
  partnerId?: string;
  projectId?: string;
  pettyCashId?: string;
  salesCustomerId?: string;
  bankAccountId?: string;

  // ─── explicit detail overrides ───
  debitDetailId?: string;
  creditDetailId?: string;

  userId?: string;
  sourceId?: string;
}
`;
  write(p, clean);
  console.log('✅ DTO: بازنویسی شد (interface)');
}

/* ---------- 2) accounting-engine.service.ts: hints با bankAccountId ---------- */
{
  const p = 'src/modules/accounting/engine/accounting-engine.service.ts';
  let c = read(p).replace(/\r\n/g, '\n');

  if (c.includes('ctx.bankAccountId')) {
    console.log('   ✓ engine: از قبل پچ شده');
  } else {
    const from = `      const hints: Array<string | undefined> = [
        ctx.partnerId,
        ctx.pettyCashId,
        ctx.salesCustomerId,
      ].filter(Boolean) as string[];`;
    const to = `      const hints: Array<string | undefined> = [
        ctx.partnerId,
        ctx.pettyCashId,
        ctx.salesCustomerId,
        ctx.bankAccountId,
      ].filter(Boolean) as string[];`;

    if (c.includes(from)) {
      write(p, c.replace(from, to));
      console.log('   ✅ engine: bankAccountId به hints اضافه شد');
    } else {
      // fallback: جستجوی انعطاف‌پذیر
      const re = /const hints: Array<string \| undefined> = \[([\s\S]*?)\]\.filter\(Boolean\) as string\[\];/;
      const m = c.match(re);
      if (m) {
        const body = m[1].trimEnd();
        const newBody = body.includes('bankAccountId')
          ? body
          : body + '\n        ctx.bankAccountId,';
        c = c.replace(re, `const hints: Array<string | undefined> = [${newBody}\n      ].filter(Boolean) as string[];`);
        write(p, c);
        console.log('   ✅ engine: bankAccountId اضافه شد (fallback)');
      } else {
        console.log('   ⚠ engine: الگو پیدا نشد — دستی باید بررسی شود');
      }
    }
  }
}

/* ---------- 3) cheques.service.ts ---------- */
{
  const p = 'src/modules/bank/cheques.service.ts';
  let c = read(p).replace(/\r\n/g, '\n');
  const hasCreate = c.includes('bankAccountId: created.bankAccountId');
  const hasSettle = c.includes('bankAccountId: c.bankAccountId');
  if (hasCreate && hasSettle) {
    console.log('   ✓ cheques.service: هر دو محل از قبل OK');
  } else {
    console.log(`   ⚠ cheques.service: create=${hasCreate}, settle=${hasSettle} — نیاز به پچ دستی`);
  }
}

/* ---------- 4) test-bank-hook.js ---------- */
{
  const p = 'scripts/test-bank-hook.js';
  let c = read(p).replace(/\r\n/g, '\n');
  const hasMatches = c.includes('const matches =');
  if (hasMatches) {
    console.log('   ✓ test: prefix matching از قبل OK');
  } else {
    console.log('   ⚠ test: prefix matching نیست');
  }
  // برچسب نسخه
  c = c.replace(/test-bank-hook\.js \(fix\d+\)/g, 'test-bank-hook.js (fix47)');
  c = c.replace(/test-bank-hook\.js — fix\d+/g, 'test-bank-hook.js — fix47');
  write(p, c);
}

/* ---------- 5) پاکسازی apply-fix44.js (بازگرداندن از .SKIP) ---------- */
{
  const p = 'scripts/apply-fix44.js';
  if (exists(p)) {
    let c = read(p);
    if (c.includes('.SKIP')) {
      c = c.replace(
        "const p = 'src/modules/accounting/engine/dto/post-event.dto.ts.SKIP';",
        "const p = 'src/modules/accounting/engine/dto/post-event.dto.ts';"
      );
      write(p, c);
      console.log('   ✅ apply-fix44.js: مسیر DTO بازگردانی شد');
    } else {
      console.log('   ✓ apply-fix44.js: نیازی به اصلاح ندارد');
    }
  }
}

console.log('\n🎉 apply-fix47 تمام شد');