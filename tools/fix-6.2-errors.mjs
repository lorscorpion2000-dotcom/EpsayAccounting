import fs from 'node:fs';

const AUTH = 'E:\\EpsayAccounting\\backend\\src\\modules\\auth';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// ═══════════════════════════════════════
// 1) auth.service.ts — Prisma.JsonNull
// ═══════════════════════════════════════
const svcPath = AUTH + '\\auth.service.ts';
fs.copyFileSync(svcPath, `${svcPath}.bak-${STAMP}`);
let svc = fs.readFileSync(svcPath, 'utf8');

if (!svc.includes("from '@prisma/client'")) {
  svc = svc.replace(
    "import { PrismaService } from '../../shared/prisma/prisma.service';",
    "import { PrismaService } from '../../shared/prisma/prisma.service';\nimport { Prisma } from '@prisma/client';"
  );
  console.log('OK import Prisma');
}

svc = svc.replace(
  'twoFactorRecoveryCodes: null,',
  'twoFactorRecoveryCodes: Prisma.JsonNull,'
);
console.log('OK JsonNull fix');

fs.writeFileSync(svcPath, svc, 'utf8');

// ═══════════════════════════════════════
// 2) two-factor.service.ts — otplib API fix
// ═══════════════════════════════════════
const tfPath = AUTH + '\\two-factor.service.ts';
fs.copyFileSync(tfPath, `${tfPath}.bak-${STAMP}`);
let tf = fs.readFileSync(tfPath, 'utf8');

// جایگزینی import
tf = tf.replace(
  "import { authenticator } from 'otplib';",
  "import * as otplib from 'otplib';\n\n// otplib v13+ API compatibility\nconst authenticator: any =\n  (otplib as any).authenticator ||\n  (otplib as any).default?.authenticator ||\n  (otplib as any).totp ||\n  (otplib as any).default?.totp ||\n  (otplib as any);"
);
console.log('OK otplib import fix');

fs.writeFileSync(tfPath, tf, 'utf8');

console.log('=== DONE ===');