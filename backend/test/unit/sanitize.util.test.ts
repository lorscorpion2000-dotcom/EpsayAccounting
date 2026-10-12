import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSensitiveKey, sanitize, sanitizeString } from '../../src/common/utils/sanitize.util';

test('isSensitiveKey: password/token/secret (case-insensitive + substring)', () => {
  assert.equal(isSensitiveKey('password'), true);
  assert.equal(isSensitiveKey('PASSWORD'), true);
  assert.equal(isSensitiveKey('accessToken'), true);
  assert.equal(isSensitiveKey('tokenHash'), true);
  assert.equal(isSensitiveKey('userName'), false);
  assert.equal(isSensitiveKey('notes'), false);
});

test('sanitize: redacts sensitive keys recursively', () => {
  const input = {
    username: 'admin',
    password: 'hunter2',
    nested: { token: 'eyJ...', value: 42 },
    array: [{ apiKey: 'xxx' }, { name: 'ok' }],
  };
  const out: any = sanitize(input);
  assert.equal(out.username, 'admin');
  assert.equal(out.password, '***REDACTED***');
  assert.equal(out.nested.token, '***REDACTED***');
  assert.equal(out.nested.value, 42);
  assert.equal(out.array[0].apiKey, '***REDACTED***');
  assert.equal(out.array[1].name, 'ok');
});

test('sanitize: passes primitives unchanged', () => {
  assert.equal(sanitize(null), null);
  assert.equal(sanitize(undefined), undefined);
  assert.equal(sanitize('hello'), 'hello');
  assert.equal(sanitize(42), 42);
});

test('sanitizeString: replaces JWT-like strings', () => {
  const jwt = 'auth: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const out = sanitizeString(jwt);
  assert.ok(!out.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
  assert.ok(out.includes('***JWT***'));
});

test('sanitizeString: redacts password= patterns', () => {
  const s = 'login failed: username=admin password=secret123 ip=1.2.3.4';
  const out = sanitizeString(s);
  assert.ok(!out.includes('secret123'));
  assert.ok(out.includes('***REDACTED***'));
});
