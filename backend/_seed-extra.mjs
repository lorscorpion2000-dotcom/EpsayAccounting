// _seed-extra.mjs — add missing accounts + account mappings
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ACCOUNTS = [
  { code: '1.1.4',    name: 'پیش‌پرداخت‌ها',                          level: 'SUBSIDIARY', nature: 'DEBIT',  subtype: 'PREPAID',              parent: '1.1', postable: false },
  { code: '1.1.4.01', name: 'پیش‌پرداخت به تأمین‌کنندگان',            level: 'DETAIL',     nature: 'DEBIT',                                    parent: '1.1.4' },
  { code: '1.1.5',    name: 'تنخواه‌گردان‌ها',                        level: 'SUBSIDIARY', nature: 'DEBIT',                                    parent: '1.1', postable: false },
  { code: '1.1.5.01', name: 'تنخواه‌گردان‌ها',                        level: 'DETAIL',     nature: 'DEBIT',                                    parent: '1.1.5' },
  { code: '1.2.2',    name: 'استهلاک انباشته',                        level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'ACCUMULATED_DEPRECIATION', parent: '1.2', postable: false },
  { code: '1.2.2.01', name: 'استهلاک انباشته ماشین‌آلات و تجهیزات',   level: 'DETAIL',     nature: 'CREDIT',                                   parent: '1.2.2' },
  { code: '2.1.3',    name: 'مالیات و عوارض پرداختنی',                level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'TAX_PAYABLE',          parent: '2.1', postable: false },
  { code: '2.1.3.01', name: 'مالیات بر ارزش افزوده',                  level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.3' },
  { code: '2.1.4',    name: 'بیمه پرداختنی',                          level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'INSURANCE_PAYABLE',    parent: '2.1', postable: false },
  { code: '2.1.4.01', name: 'بیمه تأمین اجتماعی',                     level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.4' },
  { code: '2.1.5',    name: 'پیمانکاران و تأمین‌کنندگان',             level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'ACCOUNTS_PAYABLE',     parent: '2.1', postable: false },
  { code: '2.1.5.01', name: 'پیمانکاران جزء',                         level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.5' },
  { code: '2.1.7',    name: 'حسن انجام کار پرداختنی',                 level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'RETAINAGE_PAYABLE',    parent: '2.1', postable: false },
  { code: '2.1.7.01', name: 'حسن انجام کار پیمانکاران',               level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.7' },
  { code: '2.1.8',    name: 'کالای دریافتی فاکتورنشده (GRNI)',        level: 'SUBSIDIARY', nature: 'CREDIT',                                   parent: '2.1', postable: false },
  { code: '2.1.8.01', name: 'کالای دریافتی فاکتورنشده',               level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.8' },
  { code: '3.3',      name: 'سود و زیان انباشته',                     level: 'GENERAL',    nature: 'CREDIT', subtype: 'RETAINED_EARNINGS',    parent: '3',   postable: false },
  { code: '3.3.1',    name: 'سود و زیان انباشته',                     level: 'DETAIL',     nature: 'CREDIT',                                   parent: '3.3' },
  { code: '5.3',      name: 'هزینه استهلاک',                          level: 'GENERAL',    nature: 'DEBIT',                                    parent: '5',   postable: false },
  { code: '5.3.1',    name: 'هزینه استهلاک',                          level: 'DETAIL',     nature: 'DEBIT',                                    parent: '5.3' },
  { code: '5.4',      name: 'سربار ستاد',                             level: 'GENERAL',    nature: 'DEBIT',                                    parent: '5',   postable: false },
  { code: '5.4.1',    name: 'سربار ستاد',                             level: 'DETAIL',     nature: 'DEBIT',                                    parent: '5.4' },
];

const MAPPINGS = [
  { code: 'PURCHASE_CREDIT',          title: 'خرید نسیه',             debit: '5.1.1',     credit: '2.1.1' },
  { code: 'PURCHASE_CASH',            title: 'خرید نقدی',             debit: '5.1.1',     credit: '1.1.1.01' },
  { code: 'PURCHASE_VAT',             title: 'مالیات خرید',           debit: '2.1.3.01' },
  { code: 'SUPPLIER_PAYMENT',         title: 'پرداخت به تأمین‌کننده',  debit: '2.1.1',     credit: '1.1.1.02' },
  { code: 'SALES_INVOICE_REVENUE',    title: 'درآمد فروش',                                credit: '4.1.1' },
  { code: 'SALES_VAT',                title: 'مالیات فروش',                               credit: '2.1.3.01' },
  { code: 'SALES_RECEIPT',            title: 'دریافت از مشتری',       debit: '1.1.1.02',  credit: '1.1.2.01' },
  { code: 'SALE_CONTRACT_CASH',       title: 'دریافت نقدی فروش',     debit: '1.1.1.01' },
  { code: 'PETTYCASH_FUND',           title: 'شارژ تنخواه',           debit: '1.1.5',     credit: '1.1.1.02' },
  { code: 'PETTYCASH_EXPENSE',        title: 'هزینه تنخواه',          debit: '5.2.3',     credit: '1.1.5' },
  { code: 'CHEQUE_ISSUED_PENDING',    title: 'چک صادره - تعهد',       debit: '2.1.1',     credit: '2.1.1.02' },
  { code: 'CHEQUE_RECEIVED',          title: 'چک دریافتی',            debit: '1.1.2.02',  credit: '1.1.2.01' },
  { code: 'CHEQUE_PASSED',            title: 'وصول چک صادره',         debit: '2.1.1.02',  credit: '1.1.1.02' },
  { code: 'CHEQUE_COLLECTED',         title: 'وصول چک دریافتی',       debit: '1.1.1.02',  credit: '1.1.2.02' },
  { code: 'CHEQUE_RETURNED',          title: 'برگشت چک صادره',        debit: '2.1.1.02',  credit: '2.1.1' },
  { code: 'CHEQUE_RECEIVED_RETURNED', title: 'برگشت چک دریافتی',      debit: '1.1.2.01',  credit: '1.1.2.02' },
  { code: 'CHEQUE_CANCELLED',         title: 'ابطال چک صادره',        debit: '2.1.1.02',  credit: '2.1.1' },
  { code: 'FIXED_ASSET_ACQUISITION',  title: 'تملک دارایی ثابت',      debit: '1.2.1',     credit: '2.1.1' },
  { code: 'DEPRECIATION_MONTHLY',     title: 'استهلاک ماهانه',        debit: '5.3.1',     credit: '1.2.2.01' },
  { code: 'PAYROLL_ACCRUAL',          title: 'حقوق ستادی',            debit: '5.2.1',     credit: '2.1.2.01' },
  { code: 'PAYROLL_ACCRUAL_FIELD',    title: 'دستمزد کارگاهی',        debit: '5.1.2',     credit: '2.1.2.01' },
];

async function upsertAccount(a) {
  const ex = await prisma.account.findUnique({ where: { code: a.code } });
  if (ex) { console.log('  [i] ' + a.code + ' exists'); return; }
  let parentId = null;
  if (a.parent) {
    const p = await prisma.account.findUnique({ where: { code: a.parent } });
    if (!p) throw new Error('parent missing: ' + a.parent + ' (for ' + a.code + ')');
    parentId = p.id;
  }
  await prisma.account.create({
    data: {
      code: a.code, name: a.name,
      level: a.level, nature: a.nature,
      subtype: a.subtype ?? null,
      parentId,
      isPostable: a.postable ?? a.level === 'DETAIL',
      isActive: true,
    },
  });
  console.log('  [OK] + ' + a.code + ' ' + a.name);
}

async function resolveId(code, side) {
  if (!code) return null;
  const a = await prisma.account.findUnique({ where: { code } });
  if (!a) throw new Error(side + ' account missing: ' + code);
  return a.id;
}

async function upsertMapping(m) {
  const debitAccountId  = await resolveId(m.debit,  'debit');
  const creditAccountId = await resolveId(m.credit, 'credit');
  const ex = await prisma.accountMapping.findUnique({ where: { code: m.code } });
  if (ex) {
    await prisma.accountMapping.update({
      where: { code: m.code },
      data: { title: m.title, debitAccountId, creditAccountId, isActive: true },
    });
    console.log('  [i] ' + m.code + ' updated');
    return;
  }
  await prisma.accountMapping.create({
    data: { code: m.code, title: m.title, debitAccountId, creditAccountId, isActive: true },
  });
  console.log('  [OK] + ' + m.code);
}

async function main() {
  console.log('═══ accounts ═══');
  for (const a of ACCOUNTS) await upsertAccount(a);
  console.log('');
  console.log('═══ mappings ═══');
  for (const m of MAPPINGS) await upsertMapping(m);
  console.log('');
  const accCount = await prisma.account.count();
  const mapCount = await prisma.accountMapping.count();
  console.log('═══ summary ═══');
  console.log('  accounts: ' + accCount);
  console.log('  mappings: ' + mapCount);
  await prisma.$disconnect();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });