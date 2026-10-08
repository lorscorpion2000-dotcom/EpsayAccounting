// خروجی JSON رمزگشایی‌شده‌ی telegram config — usage: node get-telegram-config.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const encPath = 'E:\\EpsayAccounting\\tools\\telegram.config.enc.json';
const envPath = 'E:\\EpsayAccounting\\backend\\.env';

if (!fs.existsSync(encPath)) {
  console.error('❌ telegram.config.enc.json نیست');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/CONFIG_ENCRYPTION_KEY\s*=\s*(.+)/);
if (!match) {
  console.error('❌ CONFIG_ENCRYPTION_KEY تو .env نیست');
  process.exit(1);
}
const key = Buffer.from(match[1].trim(), 'base64');

const envelope = JSON.parse(fs.readFileSync(encPath, 'utf8'));
const parts = envelope.payload.split('.');
const iv = Buffer.from(parts[0], 'base64');
const tag = Buffer.from(parts[1], 'base64');
const ciphertext = Buffer.from(parts[2], 'base64');

const decipher = crypto.createDecipheriv(ALGO, key, iv);
decipher.setAuthTag(tag);
const decoded = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

// فقط همون فیلدهایی که backup script لازم داره رو خارج کن (security by design)
const parsed = JSON.parse(decoded);
const safe = {
  enabled: parsed.enabled,
  botToken: parsed.botToken,
  chatId: parsed.chatId,
  levels: parsed.levels,
  rateLimitSeconds: parsed.rateLimitSeconds,
};

process.stdout.write(JSON.stringify(safe));