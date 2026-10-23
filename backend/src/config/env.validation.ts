// src/config/env.validation.ts
// validate سراسری متغیرهای محیطی — قبل از bootstrap صدا زده می‌شود
const WEAK_SECRETS = [
  'change_me',
  'changeme',
  'secret',
  'dev-secret',
  'dev-secret-change-me',
  'dev-refresh-change-me',
  'jwt-secret',
];

const MIN_SECRET_LEN = 32;

function fail(msg: string): never {
   
  console.error('\n❌ ENV VALIDATION FAILED:');
   
  console.error('   ' + msg + '\n');
  process.exit(1);
}

export function validateEnv(): void {
  const secret = process.env.JWT_SECRET;
  const refresh = process.env.JWT_REFRESH_SECRET;

  if (!secret) fail('JWT_SECRET تعریف نشده در .env');
  if (!refresh) fail('JWT_REFRESH_SECRET تعریف نشده در .env');

  if (secret.length < MIN_SECRET_LEN) {
    fail(`JWT_SECRET کوتاهه (${secret.length} کاراکتر، حداقل ${MIN_SECRET_LEN})`);
  }
  if (refresh.length < MIN_SECRET_LEN) {
    fail(`JWT_REFRESH_SECRET کوتاهه (${refresh.length} کاراکتر، حداقل ${MIN_SECRET_LEN})`);
  }

  if (WEAK_SECRETS.includes(secret.toLowerCase())) {
    fail('JWT_SECRET یک مقدار ضعیف/پیش‌فرض است');
  }
  if (WEAK_SECRETS.includes(refresh.toLowerCase())) {
    fail('JWT_REFRESH_SECRET یک مقدار ضعیف/پیش‌فرض است');
  }

  if (secret === refresh) {
    fail('JWT_SECRET و JWT_REFRESH_SECRET نباید یکسان باشند');
  }

  const env = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(env)) {
    fail(`NODE_ENV نامعتبر: ${env}`);
  }

   
  console.log('✅ ENV validation passed');
}
