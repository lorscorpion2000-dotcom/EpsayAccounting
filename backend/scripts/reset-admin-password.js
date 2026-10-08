/* reset-admin-password.js — fix34c
 * - از بین جدول‌های حاوی "user"، جدولی را انتخاب می‌کند که ستون password دارد
 * - کاربر هدف را پیدا و پسوردش را ریست می‌کند
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_USER  = process.env.TARGET_USER  || 'amini';
const NEW_PASSWORD = process.env.NEW_PASSWORD || 'Admin@1404';

const PWD_CANDS = ['password','passwordhash','password_hash','hashedpassword','hashed_password'];

function loadHasher() {
  for (const m of ['bcryptjs', 'bcrypt', 'argon2']) {
    try { return { name: m, mod: require(m) }; } catch {}
  }
  return null;
}

async function colsOf(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    table
  );
  return rows.map(r => r.column_name);
}

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
      AND (table_name ILIKE '%user%' OR table_name ILIKE '%account%' OR table_name ILIKE '%employee%')
  `;
  const names = tables.map(t => t.table_name);
  console.log('🔎 کاندیدها:', names.join(', ') || '(هیچ)');

  let userTable = null, colNames = [], pwdField = null;
  for (const n of names) {
    const cols = await colsOf(n);
    const pf = cols.find(c => PWD_CANDS.includes(c.toLowerCase()));
    console.log(`   - ${n}: ${cols.join(', ')}${pf ? '   ← پسورد: ' + pf : ''}`);
    if (pf) { userTable = n; colNames = cols; pwdField = pf; break; }
  }
  if (!userTable) throw new Error('جدولی با ستون پسورد پیدا نشد');

  console.log(`\n🎯 جدول هدف: ${userTable}  (فیلد پسورد: ${pwdField})`);

  const userField =
       colNames.find(c => c.toLowerCase() === 'username')
    || colNames.find(c => c.toLowerCase() === 'login')
    || colNames.find(c => c.toLowerCase() === 'email')
    || 'username';

  const allUsers = await prisma.$queryRawUnsafe(`SELECT * FROM "${userTable}" LIMIT 200`);
  console.log('\n👥 کاربران:');
  allUsers.forEach(u => {
    console.log(`   id=${u.id}  ${userField}=${u[userField] ?? ''}  email=${u.email ?? ''}  role=${u.role ?? u.roleId ?? ''}`);
  });

  const target = allUsers.find(u =>
    String(u[userField] ?? '').toLowerCase() === TARGET_USER.toLowerCase()
  );
  if (!target) {
    throw new Error(`کاربر "${TARGET_USER}" پیدا نشد. یکی از نام‌های بالا را با TARGET_USER ست کن.`);
  }
  console.log(`\n🎯 هدف: ${userField}=${target[userField]}  id=${target.id}`);

  const hasher = loadHasher();
  if (!hasher) throw new Error('bcryptjs/bcrypt/argon2 نصب نیست — npm i bcryptjs');
  console.log('🔐 hasher:', hasher.name);
  const hash = hasher.name === 'argon2'
    ? await hasher.mod.hash(NEW_PASSWORD)
    : await hasher.mod.hash(NEW_PASSWORD, 10);

  const rows = await prisma.$executeRawUnsafe(
    `UPDATE "${userTable}" SET "${pwdField}" = $1 WHERE id = $2`,
    hash, target.id
  );
  console.log(`\n✅ ریست شد (${rows} ردیف).  username=${target[userField]}  password=${NEW_PASSWORD}`);
}

main()
  .catch(e => { console.error('\n💥', e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());