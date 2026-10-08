// 6.1: 2FA schema + install
import fs from 'node:fs';

const schemaPath = 'E:\\EpsayAccounting\\backend\\prisma\\schema.prisma';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(schemaPath, `${schemaPath}.bak-${STAMP}`);
console.log(`OK backup: schema.prisma.bak-${STAMP}`);

let schema = fs.readFileSync(schemaPath, 'utf8');

if (schema.includes('twoFactorEnabled')) {
  console.log('INFO: 2FA fields already exist');
  process.exit(0);
}

// اضافه کردن فیلدهای 2FA به مدل User
// بعد از mustChangePassword
const marker = `    mustChangePassword  Boolean   @default(false) @map("must_change_password")
    createdAt           DateTime  @default(now()) @map("created_at")`;

const newFields = `    mustChangePassword  Boolean   @default(false) @map("must_change_password")
    twoFactorEnabled    Boolean   @default(false) @map("two_factor_enabled")
    twoFactorSecret     String?   @map("two_factor_secret") @db.Text
    twoFactorRecoveryCodes Json?  @map("two_factor_recovery_codes")
    twoFactorEnabledAt  DateTime? @map("two_factor_enabled_at")
    createdAt           DateTime  @default(now()) @map("created_at")`;

if (!schema.includes(marker)) {
  console.log('FAIL: marker not found');
  process.exit(1);
}

schema = schema.replace(marker, newFields);
fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('OK 2FA fields added');