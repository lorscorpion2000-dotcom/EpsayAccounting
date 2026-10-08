// تولید کلید جدید + جایگزینی در .env
import crypto from 'node:crypto';
import fs from 'node:fs';

const envPath = 'E:\\EpsayAccounting\\backend\\.env';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const newKey = crypto.randomBytes(32).toString('base64');

fs.copyFileSync(envPath, `${envPath}.bak-${STAMP}`);
console.log(`✅ backup: .env.bak-${STAMP}`);

let env = fs.readFileSync(envPath, 'utf8');

// جایگزینی کلید فعلی
env = env.replace(
  /CONFIG_ENCRYPTION_KEY\s*=\s*.+/,
  `CONFIG_ENCRYPTION_KEY=${newKey}`
);

fs.writeFileSync(envPath, env, 'utf8');
console.log('✅ کلید جدید جایگزین شد');
console.log('   (کلید قبلی که تو چت لو رفت دیگه استفاده نمی‌شه)');
console.log('');
console.log('⚠️ این کلید جدیده — تو چت نذار و جایی امن ذخیره کن.');