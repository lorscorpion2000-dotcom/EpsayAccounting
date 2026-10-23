/* test-purchase.js â€” ØªØ³Øª end-to-end Ú†Ø±Ø®Ù‡ Ø®Ø±ÛŒØ¯ */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE       = process.env.API_BASE   || 'http://localhost:3000';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const PREFIXES = ['', '/api'];
let API_PREFIX = '';
let TOKEN = null;

async function tryFetch(url, opts) { try { return await fetch(url, opts); } catch { return null; } }
async function login() {
  for (const p of PREFIXES) {
    const r = await tryFetch(BASE + p + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    });
    if (r && r.ok) { const j = await r.json(); TOKEN = j.accessToken || j.token; API_PREFIX = p; console.log('login OK via ' + (p || '(root)')); return; }
  }
  throw new Error('login failed');
}
async function api(method, path, body) {
  const r = await fetch(BASE + API_PREFIX + path, {
    method, headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) { console.error('X', method, path, r.status, JSON.stringify(j).slice(0, 300)); throw new Error('API: ' + method + ' ' + path); }
  return j;
}
const iso = (d) => new Date(d).toISOString();
const fmt = (n) => new Intl.NumberFormat('fa-IR').format(Number(n));

async function findOrCreateSupplier() {
  let s = await prisma.partner.findFirst({ where: { type: 'CONTRACTOR', isActive: true } });
  if (s) { console.log('supplier Ù…ÙˆØ¬ÙˆØ¯:', s.code, s.name); return s; }
  s = await prisma.partner.create({
    data: { code: 'SUP-TEST-' + Date.now(), name: 'ØªØ£Ù…ÛŒÙ†â€ŒÚ©Ù†Ù†Ø¯Ù‡ ØªØ³ØªÛŒ', type: 'CONTRACTOR', isActive: true },
  });
  console.log('supplier Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯:', s.code, s.name);
  return s;
}

async function findOrCreateProject() {
  let p = await prisma.project.findFirst({ where: { code: 'TEST-BUD-001' } });
  if (p) return p;
  p = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!p) throw new Error('Ù‡ÛŒÚ† Ù¾Ø±ÙˆÚ˜Ù‡â€ŒØ§ÛŒ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯');
  return p;
}

async function createPO(projectId, supplierId) {
  const last = await prisma.purchaseOrder.findFirst({ orderBy: { createdAt: 'desc' }, select: { code: true } });
  const n = last ? parseInt(last.code.split('-').pop(), 10) + 1 : 1;
  const code = 'PO-TEST-' + String(n).padStart(4, '0');
  const po = await prisma.purchaseOrder.create({
    data: {
      code,
      projectId,
      supplierId,
      poDate: new Date(),
      subtotal: 100_000_000,
      taxPercent: 9,
      taxAmount: 9_000_000,
      totalAmount: 109_000_000,
      status: 'APPROVED',
      items: {
        create: [
          { rowNumber: 1, description: 'Ù…ÛŒÙ„Ú¯Ø±Ø¯ Ø¢Ø¬Ø¯Ø§Ø± A3 Ø³Ø§ÛŒØ² Û±Û¶', quantity: 1000, unit: 'KILOGRAM', unitPrice: 80_000, totalPrice: 80_000_000 },
          { rowNumber: 2, description: 'Ø³ÛŒÙ…Ø§Ù† ØªÛŒÙ¾ Û² Ù¾Ø§Ú©ØªÛŒ', quantity: 200, unit: 'NUMBER', unitPrice: 100_000, totalPrice: 20_000_000 },
        ],
      },
    },
  });
  console.log('PO Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯:', po.code, po.id);
  return po;
}

async function verifyJE(sourceId, sourceType, expectDebitCodes, expectCreditCodes, expectAmount) {
  const jes = await prisma.journalEntry.findMany({
    where: { sourceId, sourceType },
    include: { lines: { include: { account: true } } },
  });
  if (!jes.length) { console.log('  X Ù‡ÛŒÚ† JE Ø¨Ø§ sourceId=' + sourceId + ' type=' + sourceType); return false; }
  const je = jes[0];
  const d = je.lines.filter(l => Number(l.debit) > 0).map(l => l.account.code);
  const c = je.lines.filter(l => Number(l.credit) > 0).map(l => l.account.code);
  const td = je.lines.reduce((s, l) => s + Number(l.debit), 0);
  const tc = je.lines.reduce((s, l) => s + Number(l.credit), 0);
  console.log('  JE:', je.code, '| debit:', d.join(','), '| credit:', c.join(','));
  console.log('     Ø¬Ù…Ø¹ debit=' + fmt(td) + ' credit=' + fmt(tc) + ' balance=' + (Math.abs(td - tc) < 0.01 ? 'OK' : 'X'));
  const dOk = expectDebitCodes.every(code => d.some(x => x === code || x.startsWith(code + '.')));
  const cOk = expectCreditCodes.every(code => c.some(x => x === code || x.startsWith(code + '.')));
  if (!dOk) console.log('     X debit Ø§Ù†ØªØ¸Ø§Ø±:', expectDebitCodes);
  if (!cOk) console.log('     X credit Ø§Ù†ØªØ¸Ø§Ø±:', expectCreditCodes);
  if (expectAmount && Math.abs(td - expectAmount) > 0.01) console.log('     X Ù…Ø¨Ù„Øº Ø§Ù†ØªØ¸Ø§Ø± ' + fmt(expectAmount) + ' pero ' + fmt(td));
  return dOk && cOk && (Math.abs(td - tc) < 0.01);
}

async function main() {
  console.log('=== test-purchase.js ===\n');
  let allOk = true;

  await login();
  const supplier = await findOrCreateSupplier();
  const project  = await findOrCreateProject();
  console.log('project:', project.code, project.name, '\n');

  // â•â•â•â•â• 1) Ø³Ø§Ø®Øª PO ØªØ³ØªÛŒ â•â•â•â•â•
  console.log('=== 1) Ø³Ø§Ø®Øª PO ===');
  const po = await createPO(project.id, supplier.id);

  // â•â•â•â•â• 2) Ø³Ø§Ø®Øª ÙØ§Ú©ØªÙˆØ± Ø§Ø² PO â•â•â•â•â•
  console.log('\n=== 2) Ø³Ø§Ø®Øª ÙØ§Ú©ØªÙˆØ± Ø§Ø² PO ===');
  const inv = await api('POST', '/purchase-invoices/from-po/' + po.id, {
    invoiceNumber: 'INV-TEST-' + Date.now(),
    invoiceDate: iso(new Date()),
    dueDate: iso(new Date(Date.now() + 30 * 86400000)),
  });
  console.log('PI Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯:', inv.code, '| number=' + inv.invoiceNumber);
  console.log('  subtotal:', fmt(inv.subtotal), '| tax:', fmt(inv.taxAmount), '| total:', fmt(inv.totalAmount));
  console.log('  status:', inv.status);

  // â•â•â•â•â• 3) ØªØ£ÛŒÛŒØ¯ ÙØ§Ú©ØªÙˆØ± â†’ JE Ø³Ù‡â€ŒØ®Ø·ÛŒ â•â•â•â•â•
  console.log('\n=== 3) ØªØ£ÛŒÛŒØ¯ ÙØ§Ú©ØªÙˆØ± ===');
  const approved = await api('POST', '/purchase-invoices/' + inv.id + '/approve');
  console.log('  status Ø¨Ø¹Ø¯ÛŒ:', approved.status, '| journalEntryId:', approved.journalEntryId);

  const jeOk = await verifyJE(
    inv.id,
    'PURCHASE_INVOICE',
    ['5.1.1', '2.1.3'],       // debit: Ù‡Ø²ÛŒÙ†Ù‡ + VAT
    ['2.1.1'],                 // credit: Ù¾Ø±Ø¯Ø§Ø®ØªÙ†ÛŒ
    Number(inv.totalAmount),
  );
  if (!jeOk) allOk = false;

  // â•â•â•â•â• 4) Ù¾Ø±Ø¯Ø§Ø®Øª Ù†Ù‚Ø¯ÛŒ/Ø¨Ø§Ù†Ú©ÛŒ (Ù†ØµÙ) â•â•â•â•â•
  console.log('\n=== 4) Ù¾Ø±Ø¯Ø§Ø®Øª 50% ===');
  const bank = await prisma.bankAccount.findFirst({ where: { isActive: true } });
  const halfAmount = Math.round(Number(inv.totalAmount) / 2);
  const pay1 = await api('POST', '/supplier-payments', {
    invoiceId: inv.id,
    method: bank ? 'BANK_TRANSFER' : 'CASH',
    bankAccountId: bank?.id,
    amount: halfAmount,
    paymentDate: iso(new Date()),
    reference: 'TEST-PART-1',
  });
  console.log('  payment:', pay1.code, '| amount:', fmt(pay1.amount), '| jeId:', pay1.journalEntryId);

  const invAfter1 = await prisma.purchaseInvoice.findUnique({ where: { id: inv.id } });
  console.log('  invoice status:', invAfter1.status, '| paid:', fmt(invAfter1.paidAmount));
  if (invAfter1.status !== 'PARTIALLY_PAID') { console.log('  X Ø§Ù†ØªØ¸Ø§Ø± PARTIALLY_PAID'); allOk = false; }

  // â•â•â•â•â• 5) Ù¾Ø±Ø¯Ø§Ø®Øª Ù…Ø§Ù†Ø¯Ù‡ â•â•â•â•â•
  console.log('\n=== 5) Ù¾Ø±Ø¯Ø§Ø®Øª Ù…Ø§Ù†Ø¯Ù‡ ===');
  const remaining = Number(invAfter1.totalAmount) - Number(invAfter1.paidAmount);
  const pay2 = await api('POST', '/supplier-payments', {
    invoiceId: inv.id,
    method: bank ? 'BANK_TRANSFER' : 'CASH',
    bankAccountId: bank?.id,
    amount: remaining,
    paymentDate: iso(new Date()),
    reference: 'TEST-FULL',
  });
  console.log('  payment:', pay2.code, '| amount:', fmt(pay2.amount));

  const invAfter2 = await prisma.purchaseInvoice.findUnique({ where: { id: inv.id } });
  console.log('  invoice status:', invAfter2.status, '| paid:', fmt(invAfter2.paidAmount));
  if (invAfter2.status !== 'PAID') { console.log('  X Ø§Ù†ØªØ¸Ø§Ø± PAID'); allOk = false; }

  // â•â•â•â•â• 6) Ú†Ú© JE Ù¾Ø±Ø¯Ø§Ø®Øª Ø¯ÙˆÙ… â•â•â•â•â•
  console.log('\n=== 6) ØªØ£ÛŒÛŒØ¯ JE Ù¾Ø±Ø¯Ø§Ø®Øª Ø¯ÙˆÙ… ===');
  const pay2JeOk = await verifyJE(
    pay2.code,
    'SUPPLIER_PAYMENT',
    ['2.1.1'],                 // debit: Ù¾Ø±Ø¯Ø§Ø®ØªÙ†ÛŒ
    ['1.1.1'],   // credit: Ø¨Ø§Ù†Ú©/Ù†Ù‚Ø¯
    remaining,
  );
  if (!pay2JeOk) allOk = false;

  console.log('\n=== Ø®Ù„Ø§ØµÙ‡ ===');
  console.log('  Ø³Ø§Ø®Øª PI Ø§Ø² PO    :', inv?.code ? 'OK' : 'X');
  console.log('  ØªØ£ÛŒÛŒØ¯ + JE Ø³Ù‡â€ŒØ®Ø·ÛŒ:', jeOk ? 'OK' : 'X');
  console.log('  Ù¾Ø±Ø¯Ø§Ø®Øª Ø¬Ø²Ø¦ÛŒ       :', invAfter1?.status === 'PARTIALLY_PAID' ? 'OK' : 'X');
  console.log('  Ù¾Ø±Ø¯Ø§Ø®Øª Ú©Ø§Ù…Ù„       :', invAfter2?.status === 'PAID' ? 'OK' : 'X');
  console.log('  JE Ù¾Ø±Ø¯Ø§Ø®Øª         :', pay2JeOk ? 'OK' : 'X');
  console.log(allOk ? '\nÙ‡Ù…Ù‡ Ù¾Ø§Ø³ Ø´Ø¯Ù†Ø¯' : '\nØ¨Ø±Ø®ÛŒ Ø´Ú©Ø³Øª Ø®ÙˆØ±Ø¯Ù†Ø¯');

  console.log('\n=== Ù„ÛŒÙ†Ú©â€ŒÙ‡Ø§ ===');
  console.log('  PI id:', inv.id);
  console.log('  PO id:', po.id);
}
main().catch(e => { console.error('X', e.message || e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
