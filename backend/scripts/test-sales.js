const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE = process.env.API_BASE || 'http://localhost:3000';
const ADMIN_USER = 'admin';
const ADMIN_PASS = '';
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

async function ensureCustomer() {
  let c = await prisma.salesCustomer.findFirst({ where: { isActive: true } });
  if (c) { console.log('customer:', c.fullName); return c; }
  c = await prisma.salesCustomer.create({
    data: { fullName: 'مشتری تستی fix75', mobilePhone: '09120000000', nationalId: '1234567890', isActive: true },
  });
  console.log('customer ساخته شد:', c.fullName);
  return c;
}

async function verifyJE(sourceId, sourceType, expectDebitPrefix, expectCreditPrefixes, expectedAmount) {
  const jes = await prisma.journalEntry.findMany({
    where: { sourceId, sourceType },
    include: { lines: { include: { account: true } } },
  });
  if (!jes.length) { console.log('  X هیچ JE برای ' + sourceId); return false; }
  const je = jes[0];
  const d = je.lines.filter((l) => Number(l.debit) > 0).map((l) => l.account.code);
  const c = je.lines.filter((l) => Number(l.credit) > 0).map((l) => l.account.code);
  const td = je.lines.reduce((s, l) => s + Number(l.debit), 0);
  const tc = je.lines.reduce((s, l) => s + Number(l.credit), 0);
  console.log('  JE:', je.code, '| debit:', d.join(','), '| credit:', c.join(','));
  console.log('     debit=' + fmt(td) + ' credit=' + fmt(tc) + ' balance=' + (Math.abs(td - tc) < 0.01 ? 'OK' : 'X'));
  const dOk = d.some((x) => x === expectDebitPrefix || x.startsWith(expectDebitPrefix + '.'));
  const cOk = expectCreditPrefixes.some((p) => c.some((x) => x === p || x.startsWith(p + '.')));
  if (!dOk) console.log('     X debit انتظار ' + expectDebitPrefix);
  if (!cOk) console.log('     X credit انتظار ' + expectCreditPrefixes.join(' or '));
  if (expectedAmount && Math.abs(td - expectedAmount) > 0.01) console.log('     X مبلغ انتظار ' + fmt(expectedAmount));
  return dOk && cOk && Math.abs(td - tc) < 0.01;
}

async function main() {
  console.log('=== test-sales.js ===\n');
  let allOk = true;
  await login();

  const customer = await ensureCustomer();
  const project = await prisma.project.findFirst({ where: { code: 'TEST-BUD-001' } });
  if (!project) throw new Error('پروژه TEST-BUD-001 پیدا نشد');

  console.log('\n=== 1) ساخت فاکتور فروش دستی ===');
  const inv = await api('POST', '/sales-invoices', {
    invoiceNumber: 'INV-S-' + Date.now(),
    invoiceDate: iso(new Date()),
    dueDate: iso(new Date(Date.now() + 30 * 86400000)),
    customerId: customer.id,
    projectId: project.id,
    taxPercent: 9,
    discountAmount: 0,
    items: [
      { description: 'فروش متریال مازاد', quantity: 10, unit: 'NUMBER', unitPrice: 5_000_000, totalPrice: 50_000_000 },
      { description: 'خدمات نصب', quantity: 1, unit: 'SERVICE', unitPrice: 20_000_000, totalPrice: 20_000_000 },
    ],
  });
  console.log('SI ساخته شد:', inv.code, '| subtotal=' + fmt(inv.subtotal), '| tax=' + fmt(inv.taxAmount), '| total=' + fmt(inv.totalAmount));

  console.log('\n=== 2) تأیید فاکتور ===');
  const approved = await api('POST', '/sales-invoices/' + inv.id + '/approve');
  console.log('  status:', approved.status, '| JE:', approved.journalEntryId);

  const jeOk = await verifyJE(inv.id, 'SALES_INVOICE', '1.1.2', ['4.2.1', '2.1.3'], Number(inv.totalAmount));
  if (!jeOk) allOk = false;

  console.log('\n=== 3) دریافت 40% ===');
  const bank = await prisma.bankAccount.findFirst({ where: { isActive: true } });
  const half = Math.round(Number(inv.totalAmount) * 0.4);
  const r1 = await api('POST', '/sales-receipts', {
    invoiceId: inv.id,
    method: bank ? 'BANK_TRANSFER' : 'CASH',
    bankAccountId: bank?.id,
    amount: half,
    receiptDate: iso(new Date()),
    reference: 'TEST-SR-1',
  });
  console.log('  receipt:', r1.code, '| amount=' + fmt(r1.amount));

  const invAfter1 = await prisma.salesInvoice.findUnique({ where: { id: inv.id } });
  console.log('  status:', invAfter1.status, '| received=' + fmt(invAfter1.receivedAmount));
  if (invAfter1.status !== 'PARTIALLY_RECEIVED') { console.log('  X انتظار PARTIALLY_RECEIVED'); allOk = false; }

  console.log('\n=== 4) دریافت مانده ===');
  const rem = Number(invAfter1.totalAmount) - Number(invAfter1.receivedAmount);
  const r2 = await api('POST', '/sales-receipts', {
    invoiceId: inv.id,
    method: bank ? 'BANK_TRANSFER' : 'CASH',
    bankAccountId: bank?.id,
    amount: rem,
    receiptDate: iso(new Date()),
    reference: 'TEST-SR-FULL',
  });
  console.log('  receipt:', r2.code, '| amount=' + fmt(r2.amount));

  const invAfter2 = await prisma.salesInvoice.findUnique({ where: { id: inv.id } });
  console.log('  status:', invAfter2.status, '| received=' + fmt(invAfter2.receivedAmount));
  if (invAfter2.status !== 'PAID') { console.log('  X انتظار PAID'); allOk = false; }

  console.log('\n=== 5) JE دریافت ===');
  const jeRecOk = await verifyJE(r2.code, 'SALES_RECEIPT', '1.1.1', ['1.1.2'], rem);
  if (!jeRecOk) allOk = false;

  console.log('\n=== خلاصه ===');
  console.log('  ساخت SI + approve  :', jeOk ? 'OK' : 'X');
  console.log('  دریافت جزئی         :', invAfter1.status === 'PARTIALLY_RECEIVED' ? 'OK' : 'X');
  console.log('  دریافت کامل         :', invAfter2.status === 'PAID' ? 'OK' : 'X');
  console.log('  JE دریافت           :', jeRecOk ? 'OK' : 'X');
  console.log(allOk ? '\n🎉 همه پاس شدند' : '\n⚠️  برخی شکست خوردند');
  console.log('\n=== لینک‌ها ===');
  console.log('  SI id:', inv.id);
}
main().catch(e => { console.error('X', e.message || e); process.exitCode = 1; }).finally(() => prisma.$disconnect());