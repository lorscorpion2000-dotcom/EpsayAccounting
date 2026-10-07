// src/common/validators/password.validator.ts
// قوانین قدرت رمز عبور — قابل استفاده در service ها
export const PASSWORD_RULES = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 128,
  SYMBOLS: '!@#$%^&*()_+-=[]{};:\'"|,.<>/?~`',
};

/**
 * بررسی قدرت رمز عبور
 * @returns آرایه پیام‌های خطا — خالی = قبول
 */
export function validatePassword(password: string, username?: string): string[] {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return ['رمز عبور الزامی است'];
  }

  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    errors.push(`حداقل ${PASSWORD_RULES.MIN_LENGTH} کاراکتر`);
  }
  if (password.length > PASSWORD_RULES.MAX_LENGTH) {
    errors.push(`حداکثر ${PASSWORD_RULES.MAX_LENGTH} کاراکتر`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('حداقل یک حرف کوچک لاتین');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('حداقل یک حرف بزرگ لاتین');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('حداقل یک عدد');
  }

  // نماد خاص — با includes مستقیم (بدون regex، بدون باگ رنج)
  const hasSymbol = [...password].some((c) =>
    PASSWORD_RULES.SYMBOLS.includes(c),
  );
  if (!hasSymbol) {
    errors.push('حداقل یک نماد خاص (مثل !@#$%)');
  }

  if (/\s/.test(password)) {
    errors.push('بدون فاصله یا tab');
  }

  if (username && username.length >= 3) {
    const pwLower = password.toLowerCase();
    const unLower = username.toLowerCase();
    if (pwLower.includes(unLower)) {
      errors.push('نباید شامل نام کاربری باشد');
    }
  }

  // تکرار ۳ بار یا بیشتر از یک کاراکتر یکسان
  if (/(.)\1{2,}/.test(password)) {
    errors.push('بدون تکرار ۳ بار یا بیشتر از یک کاراکتر');
  }

  return errors;
}
