// _seed-extra.mjs ΓÇö add missing accounts + account mappings
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ACCOUNTS = [
  { code: '1.1.4',    name: '┘╛█î╪┤ΓÇî┘╛╪▒╪»╪º╪«╪¬ΓÇî┘ç╪º',                          level: 'SUBSIDIARY', nature: 'DEBIT',  subtype: 'PREPAID',              parent: '1.1', postable: false },
  { code: '1.1.4.01', name: '┘╛█î╪┤ΓÇî┘╛╪▒╪»╪º╪«╪¬ ╪¿┘ç ╪¬╪ú┘à█î┘åΓÇî┌⌐┘å┘å╪»┌»╪º┘å',            level: 'DETAIL',     nature: 'DEBIT',                                    parent: '1.1.4' },
  { code: '1.1.5',    name: '╪¬┘å╪«┘ê╪º┘çΓÇî┌»╪▒╪»╪º┘åΓÇî┘ç╪º',                        level: 'SUBSIDIARY', nature: 'DEBIT',                                    parent: '1.1', postable: false },
  { code: '1.1.5.01', name: '╪¬┘å╪«┘ê╪º┘çΓÇî┌»╪▒╪»╪º┘åΓÇî┘ç╪º',                        level: 'DETAIL',     nature: 'DEBIT',                                    parent: '1.1.5' },
  { code: '1.2.2',    name: '╪º╪│╪¬┘ç┘ä╪º┌⌐ ╪º┘å╪¿╪º╪┤╪¬┘ç',                        level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'ACCUMULATED_DEPRECIATION', parent: '1.2', postable: false },
  { code: '1.2.2.01', name: '╪º╪│╪¬┘ç┘ä╪º┌⌐ ╪º┘å╪¿╪º╪┤╪¬┘ç ┘à╪º╪┤█î┘åΓÇî╪ó┘ä╪º╪¬ ┘ê ╪¬╪¼┘ç█î╪▓╪º╪¬',   level: 'DETAIL',     nature: 'CREDIT',                                   parent: '1.2.2' },
  { code: '2.1.3',    name: '┘à╪º┘ä█î╪º╪¬ ┘ê ╪╣┘ê╪º╪▒╪╢ ┘╛╪▒╪»╪º╪«╪¬┘å█î',                level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'TAX_PAYABLE',          parent: '2.1', postable: false },
  { code: '2.1.3.01', name: '┘à╪º┘ä█î╪º╪¬ ╪¿╪▒ ╪º╪▒╪▓╪┤ ╪º┘ü╪▓┘ê╪»┘ç',                  level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.3' },
  { code: '2.1.4',    name: '╪¿█î┘à┘ç ┘╛╪▒╪»╪º╪«╪¬┘å█î',                          level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'INSURANCE_PAYABLE',    parent: '2.1', postable: false },
  { code: '2.1.4.01', name: '╪¿█î┘à┘ç ╪¬╪ú┘à█î┘å ╪º╪¼╪¬┘à╪º╪╣█î',                     level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.4' },
  { code: '2.1.5',    name: '┘╛█î┘à╪º┘å┌⌐╪º╪▒╪º┘å ┘ê ╪¬╪ú┘à█î┘åΓÇî┌⌐┘å┘å╪»┌»╪º┘å',             level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'ACCOUNTS_PAYABLE',     parent: '2.1', postable: false },
  { code: '2.1.5.01', name: '┘╛█î┘à╪º┘å┌⌐╪º╪▒╪º┘å ╪¼╪▓╪í',                         level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.5' },
  { code: '2.1.7',    name: '╪¡╪│┘å ╪º┘å╪¼╪º┘à ┌⌐╪º╪▒ ┘╛╪▒╪»╪º╪«╪¬┘å█î',                 level: 'SUBSIDIARY', nature: 'CREDIT', subtype: 'RETAINAGE_PAYABLE',    parent: '2.1', postable: false },
  { code: '2.1.7.01', name: '╪¡╪│┘å ╪º┘å╪¼╪º┘à ┌⌐╪º╪▒ ┘╛█î┘à╪º┘å┌⌐╪º╪▒╪º┘å',               level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.7' },
  { code: '2.1.8',    name: '┌⌐╪º┘ä╪º█î ╪»╪▒█î╪º┘ü╪¬█î ┘ü╪º┌⌐╪¬┘ê╪▒┘å╪┤╪»┘ç (GRNI)',        level: 'SUBSIDIARY', nature: 'CREDIT',                                   parent: '2.1', postable: false },
  { code: '2.1.8.01', name: '┌⌐╪º┘ä╪º█î ╪»╪▒█î╪º┘ü╪¬█î ┘ü╪º┌⌐╪¬┘ê╪▒┘å╪┤╪»┘ç',               level: 'DETAIL',     nature: 'CREDIT',                                   parent: '2.1.8' },
  { code: '3.3',      name: '╪│┘ê╪» ┘ê ╪▓█î╪º┘å ╪º┘å╪¿╪º╪┤╪¬┘ç',                     level: 'GENERAL',    nature: 'CREDIT', subtype: 'RETAINED_EARNINGS',    parent: '3',   postable: false },
  { code: '3.3.1',    name: '╪│┘ê╪» ┘ê ╪▓█î╪º┘å ╪º┘å╪¿╪º╪┤╪¬┘ç',                     level: 'DETAIL',     nature: 'CREDIT',                                   parent: '3.3' },
  { code: '5.3',      name: '┘ç╪▓█î┘å┘ç ╪º╪│╪¬┘ç┘ä╪º┌⌐',                          level: 'GENERAL',    nature: 'DEBIT',                                    parent: '5',   postable: false },
  { code: '5.3.1',    name: '┘ç╪▓█î┘å┘ç ╪º╪│╪¬┘ç┘ä╪º┌⌐',                          level: 'DETAIL',     nature: 'DEBIT',                                    parent: '5.3' },
  { code: '5.4',      name: '╪│╪▒╪¿╪º╪▒ ╪│╪¬╪º╪»',                             level: 'GENERAL',    nature: 'DEBIT',                                    parent: '5',   postable: false },
  { code: '5.4.1',    name: '╪│╪▒╪¿╪º╪▒ ╪│╪¬╪º╪»',                             level: 'DETAIL',     nature: 'DEBIT',                                    parent: '5.4' },
];

const MAPPINGS = [
  { code: 'PURCHASE_CREDIT',          title: '╪«╪▒█î╪» ┘å╪│█î┘ç',             debit: '5.1.1',     credit: '2.1.1' },
  { code: 'PURCHASE_CASH',            title: '╪«╪▒█î╪» ┘å┘é╪»█î',             debit: '5.1.1',     credit: '1.1.1.01' },
  { code: 'PURCHASE_VAT',             title: '┘à╪º┘ä█î╪º╪¬ ╪«╪▒█î╪»',           debit: '2.1.3.01' },
  { code: 'SUPPLIER_PAYMENT',         title: '┘╛╪▒╪»╪º╪«╪¬ ╪¿┘ç ╪¬╪ú┘à█î┘åΓÇî┌⌐┘å┘å╪»┘ç',  debit: '2.1.1',     credit: '1.1.1.02' },
  { code: 'SALES_INVOICE_REVENUE',    title: '╪»╪▒╪ó┘à╪» ┘ü╪▒┘ê╪┤',                                credit: '4.1.1' },
  { code: 'SALES_VAT',                title: '┘à╪º┘ä█î╪º╪¬ ┘ü╪▒┘ê╪┤',                               credit: '2.1.3.01' },
  { code: 'SALES_RECEIPT',            title: '╪»╪▒█î╪º┘ü╪¬ ╪º╪▓ ┘à╪┤╪¬╪▒█î',       debit: '1.1.1.02',  credit: '1.1.2.01' },
  { code: 'SALE_CONTRACT_CASH',       title: '╪»╪▒█î╪º┘ü╪¬ ┘å┘é╪»█î ┘ü╪▒┘ê╪┤',     debit: '1.1.1.01' },
  { code: 'PETTYCASH_FUND',           title: '╪┤╪º╪▒┌ÿ ╪¬┘å╪«┘ê╪º┘ç',           debit: '1.1.5',     credit: '1.1.1.02' },
  { code: 'PETTYCASH_EXPENSE',        title: '┘ç╪▓█î┘å┘ç ╪¬┘å╪«┘ê╪º┘ç',          debit: '5.2.3',     credit: '1.1.5' },
  { code: 'CHEQUE_ISSUED_PENDING',    title: '┌å┌⌐ ╪╡╪º╪»╪▒┘ç - ╪¬╪╣┘ç╪»',       debit: '2.1.1',     credit: '2.1.1.02' },
  { code: 'CHEQUE_RECEIVED',          title: '┌å┌⌐ ╪»╪▒█î╪º┘ü╪¬█î',            debit: '1.1.2.02',  credit: '1.1.2.01' },
  { code: 'CHEQUE_PASSED',            title: '┘ê╪╡┘ê┘ä ┌å┌⌐ ╪╡╪º╪»╪▒┘ç',         debit: '2.1.1.02',  credit: '1.1.1.02' },
  { code: 'CHEQUE_COLLECTED',         title: '┘ê╪╡┘ê┘ä ┌å┌⌐ ╪»╪▒█î╪º┘ü╪¬█î',       debit: '1.1.1.02',  credit: '1.1.2.02' },
  { code: 'CHEQUE_RETURNED',          title: '╪¿╪▒┌»╪┤╪¬ ┌å┌⌐ ╪╡╪º╪»╪▒┘ç',        debit: '2.1.1.02',  credit: '2.1.1' },
  { code: 'CHEQUE_RECEIVED_RETURNED', title: '╪¿╪▒┌»╪┤╪¬ ┌å┌⌐ ╪»╪▒█î╪º┘ü╪¬█î',      debit: '1.1.2.01',  credit: '1.1.2.02' },
  { code: 'CHEQUE_CANCELLED',         title: '╪º╪¿╪╖╪º┘ä ┌å┌⌐ ╪╡╪º╪»╪▒┘ç',        debit: '2.1.1.02',  credit: '2.1.1' },
  { code: 'FIXED_ASSET_ACQUISITION',  title: '╪¬┘à┘ä┌⌐ ╪»╪º╪▒╪º█î█î ╪½╪º╪¿╪¬',      debit: '1.2.1',     credit: '2.1.1' },
  { code: 'DEPRECIATION_MONTHLY',     title: '╪º╪│╪¬┘ç┘ä╪º┌⌐ ┘à╪º┘ç╪º┘å┘ç',        debit: '5.3.1',     credit: '1.2.2.01' },
  { code: 'PAYROLL_ACCRUAL',          title: '╪¡┘é┘ê┘é ╪│╪¬╪º╪»█î',            debit: '5.2.1',     credit: '2.1.2.01' },
  { code: 'PAYROLL_ACCRUAL_FIELD',    title: '╪»╪│╪¬┘à╪▓╪» ┌⌐╪º╪▒┌»╪º┘ç█î',        debit: '5.1.2',     credit: '2.1.2.01' },
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
  console.log('ΓòÉΓòÉΓòÉ accounts ΓòÉΓòÉΓòÉ');
  for (const a of ACCOUNTS) await upsertAccount(a);
  console.log('');
  console.log('ΓòÉΓòÉΓòÉ mappings ΓòÉΓòÉΓòÉ');
  for (const m of MAPPINGS) await upsertMapping(m);
  console.log('');
  const accCount = await prisma.account.count();
  const mapCount = await prisma.accountMapping.count();
  console.log('ΓòÉΓòÉΓòÉ summary ΓòÉΓòÉΓòÉ');
  console.log('  accounts: ' + accCount);
  console.log('  mappings: ' + mapCount);
  await prisma.$disconnect();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
