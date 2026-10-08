// ۳.۱: رمزنگاری توکن تلگرام (فیکس syntax)
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:\\EpsayAccounting\\backend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function backup(full) {
  fs.copyFileSync(full, `${full}.bak-${STAMP}`);
  console.log(`  ✅ backup: ${path.basename(full)}`);
}

// ═══════════════════════════════════════════════════════════════
// 1) crypto.util.ts
// ═══════════════════════════════════════════════════════════════
console.log('\n--- crypto.util.ts (جدید) ---');
const utilDir = path.join(BACKEND, 'src', 'common', 'utils');
if (!fs.existsSync(utilDir)) fs.mkdirSync(utilDir, { recursive: true });

const cryptoPath = path.join(utilDir, 'crypto.util.ts');
const cryptoCode = `// src/common/utils/crypto.util.ts
// رمزنگاری AES-256-GCM برای فایل‌های config حساس
import * as crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const VERSION = 1;

export interface EncryptedEnvelope {
  version: number;
  algorithm: string;
  payload: string; // "iv.tag.ciphertext" — همه base64
}

function getKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('CONFIG_ENCRYPTION_KEY تعریف نشده در .env');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('CONFIG_ENCRYPTION_KEY باید 32 بایت (base64) باشه');
  }
  return key;
}

export function encrypt(plaintext: string): EncryptedEnvelope {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    version: VERSION,
    algorithm: ALGO,
    payload: [
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted.toString('base64'),
    ].join('.'),
  };
}

export function decrypt(envelope: EncryptedEnvelope): string {
  if (envelope.version !== VERSION) {
    throw new Error('نسخه encryption پشتیبانی نمی‌شه: ' + envelope.version);
  }
  if (envelope.algorithm !== ALGO) {
    throw new Error('الگوریتم پشتیبانی نمی‌شه: ' + envelope.algorithm);
  }

  const parts = envelope.payload.split('.');
  if (parts.length !== 3) {
    throw new Error('payload نامعتبر');
  }
  const [ivB64, tagB64, cipherB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(cipherB64, 'base64');

  if (iv.length !== IV_LENGTH) throw new Error('IV نامعتبر');

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function isEncryptedEnvelope(obj: any): obj is EncryptedEnvelope {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.version === 'number' &&
    typeof obj.algorithm === 'string' &&
    typeof obj.payload === 'string' &&
    obj.algorithm === ALGO
  );
}
`;
fs.writeFileSync(cryptoPath, cryptoCode, 'utf8');
console.log('  ✅ crypto.util.ts نوشته شد');

// ═══════════════════════════════════════════════════════════════
// 2) telegram.service.ts — reload با پشتیبانی از enc
// ═══════════════════════════════════════════════════════════════
console.log('\n--- telegram.service.ts ---');
const svcPath = path.join(BACKEND, 'src', 'common', 'services', 'telegram.service.ts');
backup(svcPath);
let svc = fs.readFileSync(svcPath, 'utf8');

// import crypto util — چک با includes ساده
const importMarker = 'crypto.util';
if (svc.indexOf(importMarker) === -1) {
  svc = svc.replace(
    "import * as path from 'node:path';",
    "import * as path from 'node:path';\nimport { decrypt, isEncryptedEnvelope } from '../utils/crypto.util';"
  );
  console.log('  ✅ import crypto.util');
} else {
  console.log('  ℹ️ import از قبل هست');
}

// جایگزینی reload()
const oldReloadStart = 'private reload() {';
const oldReloadEnd = 'this.config = null;\n    }\n  }';

const startIdx = svc.indexOf(oldReloadStart);
if (startIdx === -1) {
  console.log('  ❌ reload پیدا نشد');
  process.exit(1);
}

// پیدا کردن بلوک کامل reload
const endIdx = svc.indexOf(oldReloadEnd, startIdx);
if (endIdx === -1) {
  console.log('  ❌ پایان reload پیدا نشد');
  process.exit(1);
}

const oldReload = svc.slice(startIdx, endIdx + oldReloadEnd.length);

const newReload = `private reload() {
    try {
      // اول فایل رمزنگاری‌شده
      const encPath = 'E:\\\\EpsayAccounting\\\\tools\\\\telegram.config.enc.json';
      const plainPath = 'E:\\\\EpsayAccounting\\\\tools\\\\telegram.config.json';

      if (fs.existsSync(encPath)) {
        const raw = fs.readFileSync(encPath, 'utf8');
        const envelope = JSON.parse(raw);

        if (isEncryptedEnvelope(envelope)) {
          const decrypted = decrypt(envelope);
          this.config = JSON.parse(decrypted);
          this.loadedAt = Date.now();
          return;
        }

        this.logger.warn('telegram.config.enc.json envelope معتبر نداره — fallback به plaintext');
      }

      // fallback: plaintext
      if (!fs.existsSync(plainPath)) {
        this.config = null;
        return;
      }
      const raw = fs.readFileSync(plainPath, 'utf8');
      this.config = JSON.parse(raw);
      this.loadedAt = Date.now();
    } catch (e) {
      this.logger.warn('Telegram config parse error: ' + (e as Error).message);
      this.config = null;
    }
  }`;

svc = svc.replace(oldReload, newReload);
fs.writeFileSync(svcPath, svc, 'utf8');
console.log('  ✅ reload جایگزین شد');

console.log('\n══════════════════════════════════');
console.log('=== DONE ✅ ===');