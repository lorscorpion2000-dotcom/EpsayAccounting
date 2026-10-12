import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import * as otplib from 'otplib';
import { PrismaService } from '../../shared/prisma/prisma.service';

// otplib v13 compatibility
const _otp: any = otplib as any;

function isPromise(x: any): x is Promise<any> {
  return x && typeof x.then === 'function';
}

function otpGenerateSecret(): string {
  try {
    if (typeof _otp.generateSecret === 'function') {
      const s = _otp.generateSecret();
      if (typeof s === 'string') return s;
    }
  } catch {}
  // fallback: 20 bytes -> base32
  const b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(20);
  let out = '';
  for (const b of bytes) out += b32[b % 32];
  return out;
}

async function otpVerify(token: string, secret: string): Promise<boolean> {
  const clean = String(token || '').replace(/\s/g, '');
  if (!clean || !secret) return false;
  try {
    if (typeof _otp.verify === 'function') {
      const r = _otp.verify({ token: clean, secret });
      if (isPromise(r)) return await r;
      return !!r;
    }
  } catch {
    return false;
  }
  return false;
}

function otpKeyuri(username: string, issuer: string, secret: string): string {
  try {
    if (typeof _otp.generateURI === 'function') {
      const uri = _otp.generateURI({
        secret,
        label: username,
        issuer,
        algorithm: 'sha1',
        digits: 6,
        period: 30,
      });
      if (typeof uri === 'string') return uri;
    }
  } catch {}
  const enc = encodeURIComponent;
  return (
    'otpauth://totp/' +
    enc(issuer) + ':' + enc(username) +
    '?secret=' + secret +
    '&issuer=' + enc(issuer) +
    '&algorithm=SHA1&digits=6&period=30'
  );
}

@Injectable()
export class TwoFactorService {
  constructor(
    _prisma: PrismaService,
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
    return otpGenerateSecret();
  }

  async generateQRCode(username: string, secret: string) {
    const otpauth = otpKeyuri(username, this.issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    return { otpauth, qrDataUrl };
  }

  async verifyCode(secret: string, code: string): Promise<boolean> {
    return otpVerify(code, secret);
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
