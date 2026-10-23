import { TwoFactorService } from './two-factor.service';
import * as otplib from 'otplib';

jest.mock('otplib', () => ({
  authenticator: {
    verify: jest.fn(),
    generateSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/test'),
  },
}));

// باگ حیاتی: در بعضی نسخه‌های otplib خروجی verify شیء { valid: false } است؛
// !!r روی شیء همیشه true است و 2FA را کامل دور می‌زند.
describe('TwoFactorService.verifyCode', () => {
  const svc = new TwoFactorService({} as any, {} as any, { get: () => 'x'.repeat(40) } as any);
  const verify = (otplib as any).authenticator.verify as jest.Mock;

  it('{ valid:false } باید رد شود', async () => {
    verify.mockReturnValue({ valid: false });
    await expect(svc.verifyCode('SECRET', '000000')).resolves.toBe(false);
  });
  it('{ valid:true } باید پذیرفته شود', async () => {
    verify.mockReturnValue({ valid: true, delta: 0 });
    await expect(svc.verifyCode('SECRET', '123456')).resolves.toBe(true);
  });
  it('boolean false/true هم درست کار می‌کند', async () => {
    verify.mockReturnValue(false);
    await expect(svc.verifyCode('SECRET', '000000')).resolves.toBe(false);
    verify.mockReturnValue(true);
    await expect(svc.verifyCode('SECRET', '123456')).resolves.toBe(true);
  });
});
