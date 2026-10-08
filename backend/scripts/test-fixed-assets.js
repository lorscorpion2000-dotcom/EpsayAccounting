/* test-fixed-assets.js — تست چرخه‌ی دارایی ثابت */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE       = process.env.API_BASE   || 'http://localhost:3000';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin@1404';

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
    if (r && r.ok) { const j = await r.json(); TOKEN = j.accessToken || j.token; API_PREFIX = p; console.log('🔐 login via ' + (p || '(root)')); return; }
  }
  throw new Error('login failed');
}
async function api(method, path, body) {
  const r = await fetch(BASE + API_PREFIX + path, {
    method, headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) { console.error('❌', method, path, '→', r.status, j); throw new Error('API failed: ' + method + ' ' + path); }
  return j;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const iso   = (d) => new Date(d).toISOString();

async function jeBySource(sourceId) {
  return prisma.journalEntry.findMany({
    where: { sourceId },
    include: { lines: { include: { account: true } } },
  });
}
async function expectJE(sourceId, expectDebitCodePrefix, expectCreditCodePrefix, label) {
  const jes = await jeBySource(sourceId);
  if (!jes.length) { console.log(`  ❌ ${label}: هیچ JE (sourceId=${sourceId})`); return false; }
  const pref = (c, p) => c === p || c.startsWith(p + '.');
  for (const je of jes) {
    const d = je.lines.filter(l => Number(l.debit) > 0).map(l => l.account.code);
    const c = je.lines.filter(l => Number(l.credit) > 0).map(l => l.account.code);
    if (d.some(x => pref(x, expectDebitCodePrefix)) && c.some(x => pref(x, expectCreditCodePrefix))) {
      console.log(`  ✅ ${label}: ${je.sourceType}  ${d.join(',')} → ${c.join(',')}`);
      return true;
    }
  }
  const summary = jes.map(je => {
    const d = je.lines.filter(l => Number(l.debit) > 0).map(l => l.account.code).join(',');
    const c = je.lines.filter(l => Number(l.credit) > 0).map(l => l.account.code).join(',');
    return `${je.sourceType}[${d}→${c}]`;
  });
  console.log(`  ❌ ${label}: انتظار ${expectDebitCodePrefix}→${expectCreditCodePrefix}; یافت: ${summary.join(' | ')}`);
  return false;
}

async function findAccount(code) {
  const a = await prisma.account.findFirst({ where: { code } });
  if (!a) throw new Error('حساب ' + code + ' نیست');
  return a;
}
async function findBank() {
  const a = await prisma.bankAccount.findFirst({ where: { isActive: true } });
  if (!a) throw new Error('هیچ BankAccount فعالی نیست');
  return a;
}

async function run() {
  console.log('🧪 test-fixed-assets.js\n');
  let allOk = true;
  try {
    await login();
    const aAsset = await findAccount('1.2.1.01');
    const aDepr  = await findAccount('7.1.5');
    const aAccum = await findAccount('1.2.2.01');
    const bank   = await findBank();
    const bankGL = await prisma.account.findFirst({ where: { detailId: bank.id } });
    if (!bankGL) throw new Error('تفصیل بانک برای ' + bank.name + ' پیدا نشد');
    console.log(`🏦 بانک: ${bank.name}  gl=${bankGL.code}`);
    console.log(`🏗  asset=${aAsset.code}  deprec=${aDepr.code}  accum=${aAccum.code}`);

    console.log('\n=== ساخت دارایی جدید ===');
    const asset = await api('POST', '/fixed-assets', {
      name: 'تست fix54 — لپ‌تاپ',
      description: 'لپ‌تاپ تستی',
      acquisitionDate: iso(new Date()),
      acquisitionCost: 120000000,
      residualValue: 0,
      usefulLifeMonths: 12,
      depreciationMethod: 'STRAIGHT_LINE',
      assetAccountId: aAsset.id,
      depreciationAccountId: aDepr.id,
      accumulatedDeprecAccountId: aAccum.id,
      counterAccountId: bankGL.id,
    });
    console.log(`📝 asset: id=${asset.id} code=${asset.code} monthly=${asset.monthlyDepreciation}`);
    await sleep(600);
    const okAcq = await expectJE(asset.id, '1.2.1.01', bankGL.code, 'تملک دارایی');

    console.log('\n=== اجرای استهلاک ماهانه ===');
    const now = new Date();
    const period = { year: 1404, month: 7 };
    const res = await api('POST', '/fixed-assets/run-depreciation', period);
    console.log('  نتیجه:', JSON.stringify(res, null, 2).slice(0, 800));

    const deps = await prisma.depreciationEntry.findMany({ where: { fixedAssetId: asset.id } });
    let okDep = false;
    if (deps.length) {
      const dep = deps[0];
      console.log(`  📝 depreciation entry: ${dep.code} amount=${dep.amount}`);
      okDep = await expectJE(dep.id, '7.1.5', '1.2.2.01', 'سند استهلاک ماهانه');
    } else {
      console.log('  ❌ هیچ DepreciationEntry ساخته نشد');
    }

    const assetAfter = await prisma.fixedAsset.findUnique({ where: { id: asset.id } });
    console.log(`  bookValue: ${asset.acquisitionCost} → ${assetAfter.bookValue}   accumulated: ${assetAfter.accumulatedDepreciation}   status=${assetAfter.status}`);

    console.log('\n=== خلاصه ===');
    console.log(`  تملک دارایی          : ${okAcq ? '✅' : '❌'}`);
    console.log(`  استهلاک ماهانه       : ${okDep ? '✅' : '❌'}`);
    allOk = okAcq && okDep;
    console.log(allOk ? '\n🎉 همه پاس شدند' : '\n⚠️  برخی شکست خوردند');
  } catch (e) {
    console.error('\n💥', e.message || e);
    allOk = false;
  } finally {
    await prisma.$disconnect();
    process.exitCode = allOk ? 0 : 1;
  }
}
run();