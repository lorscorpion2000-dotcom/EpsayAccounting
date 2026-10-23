/* test-bank-hook.js — fix47
 * - برای چک صادره: partner از نوع CONTRACTOR + تفصیل زیر 2.1.5
 * - برای چک دریافتی: partner از نوع CLIENT/CUSTOMER + تفصیل زیر 1.1.2
 * - اگر partner از نوع مورد نظر نبود، می‌سازد
 * - اگر تفصیل زیر معین نبود، می‌سازد
 * - سپس چرخه‌ی JE هر دو را بررسی می‌کند
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE       = process.env.API_BASE   || 'http://localhost:3000';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '';

const PREFIXES = ['', '/api'];
let API_PREFIX = '';
let TOKEN = null;

async function tryFetch(url, opts) {
  try { return await fetch(url, opts); } catch { return null; }
}

async function login() {
  for (const p of PREFIXES) {
    const res = await tryFetch(BASE + p + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
    });
    if (res && res.ok) {
      const j = await res.json();
      TOKEN = j.accessToken || j.access_token || j.token;
      API_PREFIX = p;
      console.log('🔐 login OK via ' + (p || '(root)'));
      return;
    }
  }
  throw new Error('Login failed');
}

async function api(method, path, body) {
  const res = await fetch(BASE + API_PREFIX + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let j; try { j = JSON.parse(text); } catch { j = text; }
  if (!res.ok) {
    console.error(`❌ ${method} ${path} → ${res.status}`, j);
    throw new Error('API failed: ' + method + ' ' + path);
  }
  return j;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const iso   = (d) => new Date(d).toISOString();

/* ---------- partner + detail setup ---------- */

async function listPartnerTypes() {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT DISTINCT type FROM partners WHERE is_active = true');
    return rows.map(r => r.type);
  } catch (e) {
    console.log('   (خطا در خواندن انواع partner:', e.message, ')');
    return [];
  }
}

async function pickPartnerByTypes(typesWanted) {
  for (const t of typesWanted) {
    const p = await prisma.partner.findFirst({
      where: { type: t, isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    if (p) {
      console.log(`👤 partner ${t}: ${p.id}  ${p.code}  ${p.name}`);
      return { partner: p, type: t };
    }
  }
  // بساز
  const wanted = typesWanted[0];
  console.log(`➕ هیچ partner از نوع ${typesWanted.join('/')} نبود → ساخت...`);
  const p = await prisma.partner.create({
    data: {
      code: 'TST-' + wanted.slice(0,4).toUpperCase() + '-' + Date.now(),
      name: 'تست ' + wanted,
      type: wanted,
      isActive: true,
    }
  });
  console.log(`👤 ساخته شد: ${p.id}  ${p.code}  ${p.name}`);
  return { partner: p, type: wanted };
}

async function ensureDetailUnder(partner, parentCode, detailTypeName) {
  const parent = await prisma.account.findFirst({ where: { code: parentCode } });
  if (!parent) throw new Error('حساب معین ' + parentCode + ' پیدا نشد');

  let det = await prisma.account.findFirst({
    where: { detailId: partner.id, parentId: parent.id }
  });
  if (det) {
    console.log(`   ↳ تفصیل موجود: ${det.code}  (${det.name})`);
    return det;
  }

  const siblings = await prisma.account.findMany({
    where: { parentId: parent.id },
    select: { code: true }
  });
  let max = 0;
  for (const s of siblings) {
    const parts = s.code.split('.');
    const n = parseInt(parts[parts.length - 1], 10) || 0;
    if (n > max) max = n;
  }
  const code = `${parentCode}.${String(max + 1).padStart(2, '0')}`;

  det = await prisma.account.create({
    data: {
      code,
      name: partner.name,
      level: 'DETAIL',
      nature: parent.nature,
      parentId: parent.id,
      isPostable: true,
      isActive: true,
      detailType: detailTypeName,
      detailId: partner.id,
    }
  });
  console.log(`   ➕ تفصیل ساخته شد: ${code} زیر ${parentCode}`);

  if (parent.isPostable) {
    await prisma.account.update({ where: { id: parent.id }, data: { isPostable: false } });
    console.log(`   ↳ ${parentCode} دیگر postable نیست`);
  }
  return det;
}

/* ---------- JE check ---------- */

async function expectJE(sourceId, expectedDebit, expectedCredit, label) {
  const jes = await prisma.journalEntry.findMany({
    where: { sourceId },
    include: { lines: { include: { account: true } } }
  });
  if (jes.length === 0) {
    console.log(`  ❌ ${label}: هیچ JE با sourceId=${sourceId}`);
    return false;
  }
  const matches = (codes, want) =>
    codes.some(code => code === want || code.startsWith(want + '.'));
  for (const je of jes) {
    const d = je.lines.filter(l => Number(l.debit)  > 0).map(l => l.account.code);
    const c = je.lines.filter(l => Number(l.credit) > 0).map(l => l.account.code);
    if (matches(d, expectedDebit) && matches(c, expectedCredit)) {
      console.log(`  ✅ ${label}: ${je.sourceType}  ${d.join(',')} → ${c.join(',')}`);
      return true;
    }
  }
  const all = jes.map(je => {
    const d = je.lines.filter(l => Number(l.debit)  > 0).map(l => l.account.code).join(',');
    const c = je.lines.filter(l => Number(l.credit) > 0).map(l => l.account.code).join(',');
    return `${je.sourceType}[${d}→${c}]`;
  });
  console.log(`  ❌ ${label}: انتظار ${expectedDebit}→${expectedCredit}; یافت: ${all.join(' | ')}`);
  return false;
}

/* ---------- fixtures ---------- */

async function ensureBankAccount() {
  const list = await api('GET', '/bank-accounts');
  if (Array.isArray(list) && list.length) {
    console.log(`🏦 bank account: ${list[0].id}  (${list[0].name})`);
    return list[0];
  }
  const ba = await api('POST', '/bank-accounts', {
    name: 'حساب تستی fix42 ' + Date.now(),
    bankName: 'بانک تست',
    accountNumber: 'TEST-' + Date.now(),
    isActive: true
  });
  console.log(`🏦 ساخته شد: ${ba.id}`);
  return ba;
}

/* ---------- cycles ---------- */

async function issuedCycle(bankAccount, contractor) {
  console.log('\n=== چرخه‌ی چک صادره (CONTRACTOR) ===');
  const today = new Date();
  const cheque = await api('POST', '/cheques', {
    direction: 'ISSUED',
    serial: 'ISS-' + Date.now(),
    amount: 1000000,
    issueDate: iso(today),
    dueDate: iso(new Date(today.getTime() + 30 * 86400000)),
    bankAccountId: bankAccount.id,
    partnerId: contractor.id,
    description: 'fix42 — چک صادره'
  });
  console.log(`📝 cheque: id=${cheque.id}  code=${cheque.code}  status=${cheque.status}`);
  await sleep(800);
  const okIssued = await expectJE(cheque.id, '2.1.5', '2.1.6', 'صدور چک صادره');

  await api('PATCH', `/cheques/${cheque.id}/pass`, { note: 'fix42 pass' });
  await sleep(800);
  const okPassed = await expectJE(cheque.id, '2.1.6', '1.1.1', 'پاس شدن چک صادره');

  return { okIssued, okPassed };
}

async function receivedCycle(bankAccount, customer) {
  console.log('\n=== چرخه‌ی چک دریافتی (CUSTOMER) ===');
  const today = new Date();
  const cheque = await api('POST', '/cheques', {
    direction: 'RECEIVED',
    serial: 'RCV-' + Date.now(),
    amount: 500000,
    issueDate: iso(today),
    dueDate: iso(new Date(today.getTime() + 20 * 86400000)),
    bankAccountId: bankAccount.id,
    partnerId: customer.id,
    description: 'fix42 — چک دریافتی'
  });
  console.log(`📝 cheque: id=${cheque.id}  code=${cheque.code}  status=${cheque.status}`);
  await sleep(800);
  const okReceived = await expectJE(cheque.id, '1.1.6', '1.1.2', 'ثبت چک دریافتی');

  await api('PATCH', `/cheques/${cheque.id}/pass`, { note: 'fix42 collect' });
  await sleep(800);
  const okCollected = await expectJE(cheque.id, '1.1.1', '1.1.6', 'وصول چک دریافتی');

  return { okReceived, okCollected };
}

/* ---------- run ---------- */

async function run() {
  console.log('🧪 test-bank-hook.js (fix47)\n');
  let allOk = true;
  try {
    await login();

    console.log('\n[types] انواع partner فعال در DB:');
    const types = await listPartnerTypes();
    console.log('   →', types.join(', ') || '(هیچ)');

    const bank = await ensureBankAccount();

    console.log('\n[setup] آماده‌سازی CONTRACTOR برای چک صادره:');
    const c = await pickPartnerByTypes(['CONTRACTOR', 'SUPPLIER']);
    await ensureDetailUnder(c.partner, '2.1.5', 'CONTRACTOR');

    console.log('\n[setup] آماده‌سازی CUSTOMER برای چک دریافتی:');
    const cu = await pickPartnerByTypes(['CLIENT', 'CUSTOMER']);
    await ensureDetailUnder(cu.partner, '1.1.2', 'CUSTOMER');

    const i = await issuedCycle(bank, c.partner);
    const r = await receivedCycle(bank, cu.partner);

    console.log('\n=== خلاصه ===');
    console.log(`  صدور چک صادره : ${i.okIssued ? '✅' : '❌'}`);
    console.log(`  پاس چک صادره  : ${i.okPassed ? '✅' : '❌'}`);
    console.log(`  ثبت چک دریافتی: ${r.okReceived ? '✅' : '❌'}`);
    console.log(`  وصول چک       : ${r.okCollected ? '✅' : '❌'}`);

    allOk = i.okIssued && i.okPassed && r.okReceived && r.okCollected;
    console.log(allOk ? '\n🎉 همه پاس شدند' : '\n⚠️  برخی شکست خوردند');
  } catch (e) {
    console.error('\n💥 خطا:', e.message || e);
    allOk = false;
  } finally {
    await prisma.$disconnect();
    process.exitCode = allOk ? 0 : 1;
  }
}

run();