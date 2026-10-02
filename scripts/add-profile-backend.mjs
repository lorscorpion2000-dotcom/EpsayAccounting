import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Backend — endpoint تغییر رمز خود
// ═══════════════════════════════════════════════════════════════
const authSvcPath = ROOT + '/backend/src/modules/auth/auth.service.ts';
let svc = fs.readFileSync(authSvcPath, 'utf8');

if (!svc.includes('async changePassword')) {
  const method = `
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('کاربر پیدا نشد');

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('رمز عبور فعلی اشتباه است');

    if (!newPassword || newPassword.length < 6) {
      throw new UnauthorizedException('رمز جدید باید حداقل ۶ کاراکتر باشد');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true, message: 'رمز عبور تغییر کرد' };
  }

  async updateProfile(userId: string, data: { fullName?: string; email?: string; mobile?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        email: data.email || null,
        mobile: data.mobile || null,
      },
      select: { id: true, username: true, fullName: true, email: true, mobile: true },
    });
  }
`;

  const lastBrace = svc.lastIndexOf('}');
  svc = svc.slice(0, lastBrace) + method + svc.slice(lastBrace);
  fs.writeFileSync(authSvcPath, svc, 'utf8');
  console.log('OK auth.service.ts');
} else {
  console.log('SKIP auth.service');
}

// چک کنیم bcrypt import شده
if (!svc.includes("import * as bcrypt") && !svc.includes("import bcrypt")) {
  console.log('⚠ bcrypt import نشده — باید دستی بررسی کنید');
}

// ═══════════════════════════════════════════════════════════════
// 2) Backend Controller — endpoint
// ═══════════════════════════════════════════════════════════════
const authCtrlPath = ROOT + '/backend/src/modules/auth/auth.controller.ts';
let ctrl = fs.readFileSync(authCtrlPath, 'utf8');

if (!ctrl.includes('change-password')) {
  // افزودن imports
  if (!ctrl.includes('Patch') && !ctrl.includes('Put')) {
    ctrl = ctrl.replace(
      /import \{([^}]*)\} from '@nestjs\/common';/,
      (m, imports) => {
        const items = imports.split(',').map((s) => s.trim()).filter(Boolean);
        if (!items.includes('Patch')) items.push('Patch');
        return 'import { ' + items.join(', ') + " } from '@nestjs/common';";
      }
    );
  }

  const endpoints = `
  @Patch('change-password')
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(userId, body.oldPassword, body.newPassword);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { fullName?: string; email?: string; mobile?: string },
  ) {
    return this.authService.updateProfile(userId, body);
  }
`;

  const lastBrace = ctrl.lastIndexOf('}');
  ctrl = ctrl.slice(0, lastBrace) + endpoints + ctrl.slice(lastBrace);
  fs.writeFileSync(authCtrlPath, ctrl, 'utf8');
  console.log('OK auth.controller.ts');
} else {
  console.log('SKIP auth.controller');
}

// ═══════════════════════════════════════════════════════════════
// 3) Frontend API
// ═══════════════════════════════════════════════════════════════
const apiPath = ROOT + '/frontend/src/modules/auth/services/auth.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');

if (!api.includes('changePassword')) {
  const methods = `
export const profileApi = {
  changePassword: async (oldPassword: string, newPassword: string) => {
    const { data } = await api.patch('/auth/change-password', { oldPassword, newPassword });
    return data;
  },
  updateProfile: async (payload: { fullName?: string; email?: string; mobile?: string }) => {
    const { data } = await api.patch('/auth/profile', payload);
    return data;
  },
};
`;
  api = api + '\n' + methods;
  fs.writeFileSync(apiPath, api, 'utf8');
  console.log('OK auth.api.ts');
} else {
  console.log('SKIP auth.api');
}

console.log('');
console.log('=== DONE (backend + api) ===');