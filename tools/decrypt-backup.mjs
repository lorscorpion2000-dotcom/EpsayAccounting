// رمزگشایی backup — usage: node decrypt-backup.mjs <file.enc> [output]
import fs from 'node:fs';
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

const file = process.argv[2];
const output = process.argv[3]; // اگه نبود، stdout

if (!file) {
  console.error('usage: node decrypt-backup.mjs <file.enc> [output]');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error('❌ file not found:', file);
  process.exit(1);
}

const envPath = 'E:\\EpsayAccounting\\backend\\.env';
const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/BACKUP_ENCRYPTION_KEY\s*=\s*(.+)/);
if (!match) {
  console.error('❌ BACKUP_ENCRYPTION_KEY تو .env نیست');
  process.exit(1);
}
const key = Buffer.from(match[1].trim(), 'base64');

const envelope = JSON.parse(fs.readFileSync(file, 'utf8'));
const parts = envelope.payload.split('.');
const iv = Buffer.from(parts[0], 'base64');
const tag = Buffer.from(parts[1], 'base64');
const ciphertext = Buffer.from(parts[2], 'base64');

const decipher = crypto.createDecipheriv(ALGO, key, iv);
decipher.setAuthTag(tag);
const decoded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

if (output) {
  fs.writeFileSync(output, decoded);
  console.log(`✅ decrypted: ${file} → ${output}`);
} else {
  process.stdout.write(decoded);
}