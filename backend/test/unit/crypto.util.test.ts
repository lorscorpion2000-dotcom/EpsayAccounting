import { test } from 'node:test';
import assert from 'node:assert/strict';

// باید قبل از هر فراخوانی set شود؛ خود تابع در runtime می‌خواند
process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

import { encrypt, decrypt, isEncryptedEnvelope } from '../../src/common/utils/crypto.util';

test('encrypt/decrypt: roundtrip returns original', () => {
  const plain = 'سلام — این یک متن حساس است';
  const env = encrypt(plain);
  assert.equal(isEncryptedEnvelope(env), true);
  assert.equal(decrypt(env), plain);
});

test('encrypt: fresh IV each call → different ciphertext', () => {
  const a = encrypt('same');
  const b = encrypt('same');
  assert.notEqual(a.payload, b.payload);
});

test('decrypt: tampered ciphertext throws', () => {
  const env = encrypt('secret');
  const [iv, tag, ct] = env.payload.split('.');
  const tampered = { ...env, payload: [iv, tag, 'AAAA' + ct].join('.') };
  assert.throws(() => decrypt(tampered));
});

test('decrypt: rejects wrong version', () => {
  const env = encrypt('x');
  assert.throws(() => decrypt({ ...env, version: 999 }), /نسخه/);
});

test('encrypt: throws when CONFIG_ENCRYPTION_KEY missing', () => {
  const old = process.env.CONFIG_ENCRYPTION_KEY;
  delete process.env.CONFIG_ENCRYPTION_KEY;
  try {
    assert.throws(() => encrypt('x'), /CONFIG_ENCRYPTION_KEY/);
  } finally {
    process.env.CONFIG_ENCRYPTION_KEY = old;
  }
});

test('encrypt: throws when key wrong size', () => {
  const old = process.env.CONFIG_ENCRYPTION_KEY;
  process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(16).toString('base64');
  try {
    assert.throws(() => encrypt('x'), /32/);
  } finally {
    process.env.CONFIG_ENCRYPTION_KEY = old;
  }
});
