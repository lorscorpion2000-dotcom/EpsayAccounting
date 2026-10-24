// src/common/utils/crypto.util.ts
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

export function isEncryptedEnvelope(obj: unknown): obj is EncryptedEnvelope {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.version === 'number' &&
    typeof o.algorithm === 'string' &&
    typeof o.payload === 'string' &&
    o.algorithm === ALGO
  );
}
