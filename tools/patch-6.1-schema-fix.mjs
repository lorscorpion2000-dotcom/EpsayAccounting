import fs from 'node:fs';

const schemaPath = 'E:\\EpsayAccounting\\backend\\prisma\\schema.prisma';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(schemaPath, `${schemaPath}.bak-${STAMP}`);
console.log('OK backup');

let schema = fs.readFileSync(schemaPath, 'utf8');

if (schema.includes('twoFactorEnabled')) {
  console.log('INFO: already has 2FA fields');
  process.exit(0);
}

const oldLine = '  mustChangePassword  Boolean   @default(false) @map("must_change_password")';

if (!schema.includes(oldLine)) {
  console.log('FAIL: line not found exactly');
  console.log('Searching...');
  const i = schema.indexOf('mustChangePassword');
  console.log(JSON.stringify(schema.slice(i - 5, i + 100)));
  process.exit(1);
}

const newLines = oldLine + '\n' +
'  twoFactorEnabled    Boolean   @default(false) @map("two_factor_enabled")\n' +
'  twoFactorSecret     String?   @map("two_factor_secret") @db.Text\n' +
'  twoFactorRecoveryCodes Json?  @map("two_factor_recovery_codes")\n' +
'  twoFactorEnabledAt  DateTime? @map("two_factor_enabled_at")';

schema = schema.replace(oldLine, newLines);
fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('OK 2FA fields added');

const i = schema.indexOf('twoFactorEnabled');
console.log('--- after ---');
console.log(schema.slice(i - 100, i + 400));