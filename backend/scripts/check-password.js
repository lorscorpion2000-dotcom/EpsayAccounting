/* check-password.js — fix36
 * - با raw SQL کار می‌کند تا مستقل از نام‌گذاری Prisma باشد
 * - هش فعلی را می‌خواند، با bcryptjs/bcrypt/argon2 تست می‌کند
 * - در صورت عدم تطابق، هش جدید می‌گذارد و verify مجدد
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USERNAME = process.env.TARGET_USER  || 'admin';
const PASSWORD = process.env.NEW_PASSWORD || 'Admin@1404';

function loadLibs() {
  const out = {};
  for (const m of ['bcryptjs', 'bcrypt', 'argon2']) {
    try { out[m] = require(m); } catch {}
  }
  return out;
}

async function compare(libs, plain, hash) {
  for (const [name, mod] of Object.entries(libs)) {
    try {
      const ok = name === 'argon2'
        ? await mod.verify(hash, plain)
        : await mod.compare(plain, hash);
      console.log(`   · ${name}: ${ok ? '✅' : 'خیر'}`);
      if (ok) return name;
    } catch (e) {
      console.log(`   · ${name}: خطا → ${e.message}`);
    }
  }
  return null;
}

async function makeHash(libs, plain) {
  for (const name of ['bcryptjs', 'bcrypt', 'argon2']) {
    if (libs[name]) {
      const h = name === 'argon2'
        ? await libs[name].hash(plain)
        : await libs[name].hash(plain, 10);
      return { name, hash: h };
    }
  }
  throw new Error('هیچ lib هش موجود نیست — npm i bcryptjs');
}

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT id, username, email, is_active, password_hash
    FROM users WHERE username = ${USERNAME} LIMIT 1
  `;
  if (!rows.length) {
    const all = await prisma.$queryRaw`SELECT id, username, email, is_active FROM users`;
    console.log('👥 کاربران:');
    all.forEach(x => console.log(`   id=${x.id}  username=${x.username}  email=${x.email}  is_active=${x.is_active}`));
    throw new Error(`کاربر "${USERNAME}" پیدا نشد`);
  }

  const u = rows[0];
  console.log(`👤 ${u.username}   id=${u.id}   is_active=${u.is_active}   email=${u.email}`);
  const hashStr = String(u.password_hash ?? '');
  console.log(`🔐 password_hash prefix: ${hashStr.slice(0,12)}   طول: ${hashStr.length}`);

  const libs = loadLibs();
  console.log(`📦 libs: ${Object.keys(libs).join(', ') || '(هیچ)'}`);
  if (!Object.keys(libs).length) throw new Error('هیچ lib هش نصب نیست — npm i bcryptjs');

  console.log(`\n[1] مقایسه هش فعلی با "${PASSWORD}":`);
  const match = await compare(libs, PASSWORD, hashStr);
  if (match) {
    console.log(`   ✅ هش DB با "${PASSWORD}" می‌خورد (lib: ${match})`);
    console.log('   → اگر login 401 می‌دهد، مشکل در auth backend است (is_active یا سرویس auth).');
    return;
  }
  console.log('   ❌ مطابقت نداشت → پسورد DB این نیست.');

  console.log(`\n[2] ریست با "${PASSWORD}":`);
  const { name, hash } = await makeHash(libs, PASSWORD);
  console.log(`   🔧 هش با ${name}`);

  await prisma.$executeRaw`
    UPDATE users SET password_hash = ${hash}, is_active = true WHERE id = ${u.id}
  `;

  const rows2 = await prisma.$queryRaw`
    SELECT password_hash FROM users WHERE id = ${u.id}
  `;
  const ok2 = await compare(libs, PASSWORD, String(rows2[0].password_hash));
  console.log(`   ${ok2 ? '✅' : '❌'} verify مجدد: ${ok2 ? 'موفق' : 'ناموفق'}`);

  if (!u.is_active) {
    console.log('   (is_active هم true شد)');
  }
}

main()
  .catch(e => { console.error('\n💥', e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());