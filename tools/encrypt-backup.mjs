// رمزنگاری فایل backup — usage: node encrypt-backup.mjs <file>
import fs from 'node:fs';
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const VERSION = 1;

const file = process.argv[2];
if (!file) {
  console.error('usage: node encrypt-backup.mjs <file>');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error('❌ file not found:', file);
  process.exit(1);
}

// کلید از env
const envPath = 'E:\\EpsayAccounting\\backend\\.env';
const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/BACKUP_ENCRYPTION_KEY\s*=\s*(.+)/);
if (!match) {
  console.error('❌ BACKUP_ENCRYPTION_KEY تو .env نیست');
  process.exit(1);
}
const key = Buffer.from(match[1].trim(), 'base64');
if (key.length !== 32) {
  console.error('❌ کلید باید 32 بایت باشه');
  process.exit(1);
}

const plaintext = fs.readFileSync(file);

const iv = crypto.randomBytes(IV_LENGTH);
const cipher = crypto.createCipheriv(ALGO, key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();

const envelope = {
  version: VERSION,
  algorithm: ALGO,
  payload: [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.'),
};

const encFile = file + '.enc';
fs.writeFileSync(encFile, JSON.stringify(envelope), 'utf8');

// تأیید: round-trip
const parts = envelope.payload.split('.');
const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(parts[0], 'base64'));
decipher.setAuthTag(Buffer.from(parts[1], 'base64'));
const decoded = Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64')), decipher.final()]);

if (!decoded.equals(plaintext)) {
  console.error('❌ round-trip failed!');
  fs.unlinkSync(encFile);
  process.exit(1);
}

// حذف plaintext
fs.unlinkSync(file);

console.log(`✅ encrypted: ${file} → ${encFile}`);
console.log(`   size: ${plaintext.length} → ${fs.statSync(encFile).size}`);