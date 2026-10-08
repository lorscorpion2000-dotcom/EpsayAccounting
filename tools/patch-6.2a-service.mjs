import fs from 'node:fs';
import path from 'node:path';

const AUTH = 'E:\\EpsayAccounting\\backend\\src\\modules\\auth';

// 1) two-factor.service.ts
const servicePath = path.join(AUTH, 'two-factor.service.ts');
const serviceCode = `import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private get issuer() {
    return 'EpsayAccounting';
  }

  private get totpPendingSecret(): string {
    const base = this.config.get<string>('jwt.secret') || 'dev-secret';
    return base + ':2fa-pending';
  }

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  async generateQRCode(username: string, secret: string) {
    const otpauth = authenticator.keyuri(username, this.issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    return { otpauth, qrDataUrl };
  }

  verifyCode(secret: string, code: string): boolean {
    if (!secret || !code) return false;
    try {
      return authenticator.verify({
        token: String(code).replace(/\\s/g, ''),
        secret,
      });
    } catch {
      return false;
    }
  }

  generateRecoveryCodes(count = 8): string[] {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      let c = '';
      for (let j = 0; j < 10; j++) {
        c += chars[Math.floor(Math.random() * chars.length)];
      }
      codes.push(c.slice(0, 5) + '-' + c.slice(5));
    }
    return codes;
  }

  async hashRecoveryCodes(codes: string[]) {
    return Promise.all(
      codes.map(async (c) => ({
        hash: await bcrypt.hash(c, 10),
        used: false,
        usedAt: null,
      })),
    );
  }

  async verifyAndConsumeRecoveryCode(
    storedCodes: any[],
    inputCode: string,
  ): Promise<{ ok: boolean; newCodes: any[] | null }> {
    if (!Array.isArray(storedCodes)) return { ok: false, newCodes: null };
    const normalized = String(inputCode).trim().toUpperCase();
    for (let i = 0; i < storedCodes.length; i++) {
      const entry = storedCodes[i];
      if (!entry || entry.used) continue;
      const match = await bcrypt.compare(normalized, entry.hash);
      if (match) {
        const updated = storedCodes.map((e, idx) =>
          idx === i
            ? { ...e, used: true, usedAt: new Date().toISOString() }
            : e,
        );
        return { ok: true, newCodes: updated };
      }
    }
    return { ok: false, newCodes: null };
  }

  signTotpPendingToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId, type: 'totp-pending' },
      { secret: this.totpPendingSecret, expiresIn: '5m' },
    );
  }

  verifyTotpPendingToken(token: string): { sub: string } {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.totpPendingSecret,
      }) as any;
      if (payload.type !== 'totp-pending') {
        throw new Error('bad type');
      }
      return { sub: payload.sub };
    } catch {
      throw new UnauthorizedException(
        'توکن دو مرحله‌ای نامعتبر یا منقضی شده است',
      );
    }
  }
}
`;
fs.writeFileSync(servicePath, serviceCode, 'utf8');
console.log('OK two-factor.service.ts');

// 2) dto/two-factor.dto.ts
const dtoDir = path.join(AUTH, 'dto');
if (!fs.existsSync(dtoDir)) fs.mkdirSync(dtoDir, { recursive: true });
const dtoPath = path.join(dtoDir, 'two-factor.dto.ts');
const dtoCode = `import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code!: string;
}

export class TwoFactorDisableDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;
}

export class TwoFactorVerifyLoginDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  totpToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code!: string;
}
`;
fs.writeFileSync(dtoPath, dtoCode, 'utf8');
console.log('OK two-factor.dto.ts');

console.log('=== DONE 6.2a ===');