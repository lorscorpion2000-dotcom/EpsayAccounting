import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\frontend\\src\\store\\auth.store.ts';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.copyFileSync(file, `${file}.bak-${STAMP}`);

let txt = fs.readFileSync(file, 'utf8');

// الگوی فعلی (بدون token)
const re = /setAuth:\s*\(token,\s*user,\s*refreshToken\)\s*=>\s*set\(\(s\)\s*=>\s*\(\{[\s\S]*?\}\)\)/;

const match = txt.match(re);
if (!match) {
  console.log('FAIL: setAuth not found');
  const i = txt.indexOf('setAuth');
  console.log(JSON.stringify(txt.slice(i - 20, i + 300)));
  process.exit(1);
}

console.log('--- BEFORE ---');
console.log(match[0]);

const replacement = `setAuth: (token, user, refreshToken) =>
        set((s) => ({
          token,
          user,
          refreshToken: refreshToken ?? s.refreshToken,
          isAuthenticated: true,
        }))`;

txt = txt.replace(re, replacement);
fs.writeFileSync(file, txt, 'utf8');

console.log('--- AFTER ---');
console.log(txt.slice(txt.indexOf('setAuth'), txt.indexOf('setAuth') + 200));
console.log('OK setAuth fixed');