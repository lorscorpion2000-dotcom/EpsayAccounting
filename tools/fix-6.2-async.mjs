import fs from 'node:fs';

const svcPath = 'E:\\EpsayAccounting\\backend\\src\\modules\\auth\\auth.service.ts';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.copyFileSync(svcPath, `${svcPath}.bak-${STAMP}`);

let svc = fs.readFileSync(svcPath, 'utf8');

// verify2FALogin — await اضافه کن
svc = svc.replace(
  'let ok = this.twoFactor.verifyCode(user.twoFactorSecret, code);',
  'let ok = await this.twoFactor.verifyCode(user.twoFactorSecret, code);'
);

// enable2FA — await اضافه کن
svc = svc.replace(
  'const ok = this.twoFactor.verifyCode(user.twoFactorSecret, code);',
  'const ok = await this.twoFactor.verifyCode(user.twoFactorSecret, code);'
);

fs.writeFileSync(svcPath, svc, 'utf8');
console.log('OK auth.service.ts async fix');