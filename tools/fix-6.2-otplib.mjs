import fs from 'node:fs';

const tfPath = 'E:\\EpsayAccounting\\backend\\src\\modules\\auth\\two-factor.service.ts';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(tfPath, `${tfPath}.bak-${STAMP}`);
let tf = fs.readFileSync(tfPath, 'utf8');

// جایگزینی کل import block
tf = tf.replace(
  /import \* as otplib from 'otplib';[\s\S]*?(?=\n\n@Injectable)/,
  `import * as otplib from 'otplib';

// otplib v12+ compatibility layer
const _otplib: any = otplib as any;
const _auth: any =
  _otplib.authenticator ||
  _otplib.default?.authenticator ||
  _otplib.totp ||
  _otplib.default?.totp ||
  _otplib;

function otpGenerateSecret(): string {
  if (typeof _auth.generateSecret === 'function') return _auth.generateSecret();
  if (typeof _otplib.generateSecret === 'function') return _otplib.generateSecret();
  // fallback: تولید 32 بایت base32
  const crypto = require('node:crypto');
  const bytes = crypto.randomBytes(20);
  const b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let out = '';
  for (const b of bytes) out += b32[b % 32];
  return out;
}

function otpVerify(token: string, secret: string): boolean {
  if (typeof _auth.verify === 'function') {
    try { return _auth.verify({ token, secret }); } catch { return false; }
  }
  if (typeof _auth.check === 'function') {
    try { return _auth.check(token, secret); } catch { return false; }
  }
  if (typeof _otplib.verify === 'function') {
    try { return _otplib.verify({ token, secret }); } catch { return false; }
  }
  return false;
}

function otpKeyuri(username: string, issuer: string, secret: string): string {
  if (typeof _auth.keyuri === 'function') {
    try { return _auth.keyuri(username, issuer, secret); } catch {}
  }
  if (typeof _otplib.keyuri === 'function') {
    try { return _otplib.keyuri(username, issuer, secret); } catch {}
  }
  // fallback: خودمون می‌سازیم
  const enc = encodeURIComponent;
  return \`otpauth://totp/\${enc(issuer)}:\${enc(username)}?secret=\${secret}&issuer=\${enc(issuer)}&algorithm=SHA1&digits=6&period=30\`;
}`,
);

// جایگزینی فراخوانی‌ها
tf = tf.replace(
  /return authenticator\.generateSecret\(\);/,
  'return otpGenerateSecret();'
);

tf = tf.replace(
  /const otpauth = authenticator\.keyuri\(username, this\.issuer, secret\);/,
  'const otpauth = otpKeyuri(username, this.issuer, secret);'
);

tf = tf.replace(
  /return authenticator\.verify\(\{[\s\S]*?\}\);/,
  'return otpVerify(String(code).replace(/\\s/g, \'\'), secret);'
);

fs.writeFileSync(tfPath, tf, 'utf8');
console.log('OK two-factor.service.ts fixed');import fs from 'node:fs';

const tfPath = 'E:\\EpsayAccounting\\backend\\src\\modules\\auth\\two-factor.service.ts';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(tfPath, `${tfPath}.bak-${STAMP}`);
let tf = fs.readFileSync(tfPath, 'utf8');

// جایگزینی کل import block
tf = tf.replace(
  /import \* as otplib from 'otplib';[\s\S]*?(?=\n\n@Injectable)/,
  `import * as otplib from 'otplib';

// otplib v12+ compatibility layer
const _otplib: any = otplib as any;
const _auth: any =
  _otplib.authenticator ||
  _otplib.default?.authenticator ||
  _otplib.totp ||
  _otplib.default?.totp ||
  _otplib;

function otpGenerateSecret(): string {
  if (typeof _auth.generateSecret === 'function') return _auth.generateSecret();
  if (typeof _otplib.generateSecret === 'function') return _otplib.generateSecret();
  // fallback: تولید 32 بایت base32
  const crypto = require('node:crypto');
  const bytes = crypto.randomBytes(20);
  const b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let out = '';
  for (const b of bytes) out += b32[b % 32];
  return out;
}

function otpVerify(token: string, secret: string): boolean {
  if (typeof _auth.verify === 'function') {
    try { return _auth.verify({ token, secret }); } catch { return false; }
  }
  if (typeof _auth.check === 'function') {
    try { return _auth.check(token, secret); } catch { return false; }
  }
  if (typeof _otplib.verify === 'function') {
    try { return _otplib.verify({ token, secret }); } catch { return false; }
  }
  return false;
}

function otpKeyuri(username: string, issuer: string, secret: string): string {
  if (typeof _auth.keyuri === 'function') {
    try { return _auth.keyuri(username, issuer, secret); } catch {}
  }
  if (typeof _otplib.keyuri === 'function') {
    try { return _otplib.keyuri(username, issuer, secret); } catch {}
  }
  // fallback: خودمون می‌سازیم
  const enc = encodeURIComponent;
  return \`otpauth://totp/\${enc(issuer)}:\${enc(username)}?secret=\${secret}&issuer=\${enc(issuer)}&algorithm=SHA1&digits=6&period=30\`;
}`,
);

// جایگزینی فراخوانی‌ها
tf = tf.replace(
  /return authenticator\.generateSecret\(\);/,
  'return otpGenerateSecret();'
);

tf = tf.replace(
  /const otpauth = authenticator\.keyuri\(username, this\.issuer, secret\);/,
  'const otpauth = otpKeyuri(username, this.issuer, secret);'
);

tf = tf.replace(
  /return authenticator\.verify\(\{[\s\S]*?\}\);/,
  'return otpVerify(String(code).replace(/\\s/g, \'\'), secret);'
);

fs.writeFileSync(tfPath, tf, 'utf8');
console.log('OK two-factor.service.ts fixed');