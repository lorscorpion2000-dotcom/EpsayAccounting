// E:\EpsayAccounting\tools\fix-jwt-secrets.mjs
// بکاپ + تولید secret + جایگزینی JWT_SECRET و JWT_REFRESH_SECRET در .env ها
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BACKEND = 'E:\\EpsayAccounting\\backend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const FILES = [
  path.join(BACKEND, '.env'),
  path.join(BACKEND, '.env.production'),
];

// ۱) بکاپ
console.log('=== 1) BACKUP ===');
for (const f of FILES) {
  if (!fs.existsSync(f)) { console.log(`  skip (نیست): ${f}`); continue; }
  const bak = `${f}.bak-${STAMP}`;
  fs.copyFileSync(f, bak);
  console.log(`  ✅ ${path.basename(bak)}`);
}

// ۲) تولید secret
const NEW_SECRET = crypto.randomBytes(48).toString('base64url');           // ~64 char
const NEW_REFRESH = crypto.randomBytes(48).toString('base64url');
console.log('\n=== 2) NEW SECRETS (طول) ===');
console.log(`  JWT_SECRET          → ${NEW_SECRET.length} char`);
console.log(`  JWT_REFRESH_SECRET  → ${NEW_REFRESH.length} char`);

// ۳) جایگزینی
function setKey(content, key, value) {
  const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
  if (re.test(content)) return content.replace(re, `${key}=${value}`);
  return content.trimEnd() + `\n${key}=${value}\n`;
}

console.log('\n=== 3) APPLY ===');
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let txt = fs.readFileSync(f, 'utf8');
  const before = txt;
  txt = setKey(txt, 'JWT_SECRET', NEW_SECRET);
  txt = setKey(txt, 'JWT_REFRESH_SECRET', NEW_REFRESH);

  // اگه NODE_ENV=production داره، expiresIn رو هم کوتاه کن
  if (/NODE_ENV\s*=\s*production/m.test(txt)) {
    txt = setKey(txt, 'JWT_EXPIRES_IN', '15m');
    txt = setKey(txt, 'JWT_REFRESH_EXPIRES_IN', '7d');
    console.log(`  ${path.basename(f)} → JWT + refresh + expiresIn(prod)`);
  } else {
    txt = setKey(txt, 'JWT_EXPIRES_IN', '15m');
    txt = setKey(txt, 'JWT_REFRESH_EXPIRES_IN', '7d');
    console.log(`  ${path.basename(f)} → JWT + refresh + expiresIn(dev)`);
  }
  fs.writeFileSync(f, txt, 'utf8');
}

console.log('\n=== 4) VERIFY ===');
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  const txt = fs.readFileSync(f, 'utf8');
  const get = (k) => {
    const m = txt.match(new RegExp(`^\\s*${k}\\s*=\\s*(.*)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  console.log(`\n[${path.basename(f)}]`);
  const s = get('JWT_SECRET');
  const r = get('JWT_REFRESH_SECRET');
  console.log(`  JWT_SECRET          : ${s ? `✅ ${s.length} char` : '❌ خالی'}`);
  console.log(`  JWT_REFRESH_SECRET  : ${r ? `✅ ${r.length} char` : '❌ خالی'}`);
  console.log(`  JWT_EXPIRES_IN      : ${get('JWT_EXPIRES_IN')}`);
  console.log(`  JWT_REFRESH_EXPIRES_IN: ${get('JWT_REFRESH_EXPIRES_IN')}`);
}

console.log('\n=== DONE ✅ ===');
console.log(`secret واقعی تو .env ذخیره شد. فقط چک کن با notepad که درست باشه.`);