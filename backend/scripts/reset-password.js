/* reset-password.js — fix37
 * - هش فعلی را می‌خواند، با bcrypt/argon2 تست می‌کند
 * - در صورت عدم تطابق، با lib موجود هش جدید می‌گذارد (با کست ::uuid)
 * - verify مجدد می‌کند
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USERNAME = process.env.TARGET_USER  || 'admin';
const PASSWORD = process.env.NEW_PASSWORD || '';

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
  throw new Error('هیچ lib هش موجود نیست');
}

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT id::text AS id, username, email, is_active, password_hash
    FROM users WHERE username = ${USERNAME} LIMIT 1
  `;
  if (!rows.length) throw new Error(`کاربر "${USERNAME}" پیدا نشد`);

  const u = rows[0];
  const hashStr = String(u.password_hash ?? '');
  console.log(`👤 ${u.username}  id=${u.id}  is_active=${u.is_active}`);
  console.log(`🔐 hash prefix: ${hashStr.slice(0,12)}  طول: ${hashStr.length}`);

  const libs = loadLibs();
  console.log(`📦 libs: ${Object.keys(libs).join(', ') || '(هیچ)'}`);

  console.log(`\n[1] مقایسه با "${PASSWORD}":`);
  const match = await compare(libs, PASSWORD, hashStr);
  if (match) {
    console.log(`   ✅ هش DB درست است. مشکل در auth backend است.`);
    return;
  }

  console.log(`\n[2] ریست با "${PASSWORD}":`);
  const { name, hash } = await makeHash(libs, PASSWORD);
  console.log(`   🔧 هش با ${name}`);

  const upd = await prisma.$executeRawUnsafe(
    `UPDATE users SET password_hash = $1, is_active = true WHERE id = $2::uuid`,
    hash, u.id
  );
  console.log(`   ✅ UPDATE: ${upd} ردیف`);

  const rows2 = await prisma.$queryRaw`
    SELECT password_hash FROM users WHERE username = ${USERNAME} LIMIT 1
  `;
  const ok2 = await compare(libs, PASSWORD, String(rows2[0].password_hash));
  console.log(`   ${ok2 ? '✅' : '❌'} verify مجدد: ${ok2 ? 'موفق' : 'ناموفق'}`);
}

main()
  .catch(e => { console.error('\n💥', e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());