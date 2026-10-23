jest.mock('otplib', () => ({
  authenticator: {
    verify: jest.fn(),
    generateSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/test'),
  },
}));
import { AuthController } from './auth.controller';

describe('AuthController (Contract)', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(() => {
    authService = {
      changePassword: jest.fn().mockResolvedValue({ success: true }),
      verify2FALogin: jest.fn().mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' }),
      updatePreferences: jest.fn().mockResolvedValue({}),
    };
    controller = new AuthController(authService);
  });

  it('changePassword باید oldPassword و newPassword را جدا بفرستد', async () => {
    const dto = { oldPassword: 'old-pass-1234', newPassword: 'New-Strong-Pass@1404' } as any;
    await controller.changePassword({ user: { id: 'u1' } } as any, dto);
    expect(authService.changePassword).toHaveBeenCalledWith('u1', 'old-pass-1234', 'New-Strong-Pass@1404');
  });

  it('verify2FA اندپوینت 2FA را صدا می‌زند', async () => {
    const dto = { totpToken: 'pending-jwt', code: '123456' };
    await controller.verify2FALogin(dto, {} as any);
    expect(authService.verify2FALogin).toHaveBeenCalledWith('pending-jwt', '123456', expect.any(Object));
  });
});
