// رمزنگاری فایل telegram.config.json → telegram.config.enc.json
import fs from 'node:fs';
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const VERSION = 1;

const PLAIN = 'E:\\EpsayAccounting\\tools\\telegram.config.json';
const ENC = 'E:\\EpsayAccounting\\tools\\telegram.config.enc.json';
const ENV = 'E:\\EpsayAccounting\\backend\\.env';

// کلید
const env = fs.readFileSync(ENV, 'utf8');
const match = env.match(/CONFIG_ENCRYPTION_KEY\s*=\s*(.+)/);
if (!match) {
  console.error('❌ CONFIG_ENCRYPTION_KEY تو .env نیست. اول generate-config-key.mjs رو اجرا کن.');
  process.exit(1);
}
const key = Buffer.from(match[1].trim(), 'base64');
if (key.length !== 32) {
  console.error('❌ کلید باید 32 بایت باشه. طول فعلی:', key.length);
  process.exit(1);
}

// خوندن config
if (!fs.existsSync(PLAIN)) {
  console.error('❌ ' + PLAIN + ' پیدا نشد');
  process.exit(1);
}
const plaintext = fs.readFileSync(PLAIN, 'utf8');

// اعتبارسنجی JSON
try { JSON.parse(plaintext); } catch (e) {
  console.error('❌ JSON نامعتبر:', e.message);
  process.exit(1);
}

// رمزنگاری
const iv = crypto.randomBytes(IV_LENGTH);
const cipher = crypto.createCipheriv(ALGO, key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

const envelope = {
  version: VERSION,
  algorithm: ALGO,
  payload: [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.'),
};

// بکاپ + ذخیره
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
if (fs.existsSync(PLAIN)) {
  fs.copyFileSync(PLAIN, `${PLAIN}.bak-${STAMP}`);
  console.log(`✅ backup: telegram.config.json.bak-${STAMP}`);
}

fs.writeFileSync(ENC, JSON.stringify(envelope, null, 2), 'utf8');
console.log('✅ ' + ENC);
console.log('حجم اصلی:', plaintext.length, 'بایت');
console.log('حجم رمز:', envelope.payload.length, 'بایت');
console.log('');

// تست decode
const parts = envelope.payload.split('.');
const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(parts[0], 'base64'));
decipher.setAuthTag(Buffer.from(parts[1], 'base64'));
const decoded = Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64')), decipher.final()]).toString('utf8');

if (decoded === plaintext) {
  console.log('✅ تست round-trip موفق');
} else {
  console.error('❌ خطا در round-trip!');
  process.exit(1);
}

console.log('');
console.log('⚠️ مرحله بعد (بعد از تایید):');
console.log('   حذف/rename کردن telegram.config.json دستی');
console.log('   یا رهاش کن — اگه هر دو باشن، enc اولویت داره');