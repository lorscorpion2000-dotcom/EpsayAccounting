import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';

import { decrypt, isEncryptedEnvelope } from '../utils/crypto.util';

interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  levels: string[];
  rateLimitSeconds: number;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private config: TelegramConfig | null = null;
  private lastSent: Record<string, number> = {};
  private loadedAt = 0;

  constructor() {
    this.reload();
  }

  private reload() {
    try {
      // اول فایل رمزنگاری‌شده
      const encPath = 'E:\\EpsayAccounting\\tools\\telegram.config.enc.json';
      const plainPath = 'E:\\EpsayAccounting\\tools\\telegram.config.json';

      if (fs.existsSync(encPath)) {
        const raw = fs.readFileSync(encPath, 'utf8');
        const envelope = JSON.parse(raw);

        if (isEncryptedEnvelope(envelope)) {
          const decrypted = decrypt(envelope);
          this.config = JSON.parse(decrypted);
          this.loadedAt = Date.now();
          return;
        }

        this.logger.warn('telegram.config.enc.json envelope معتبر نداره — fallback به plaintext');
      }

      // fallback: plaintext
      if (!fs.existsSync(plainPath)) {
        this.config = null;
        return;
      }
      const raw = fs.readFileSync(plainPath, 'utf8');
      this.config = JSON.parse(raw);
      this.loadedAt = Date.now();
    } catch (e) {
      this.logger.warn('Telegram config parse error: ' + (e as Error).message);
      this.config = null;
    }
  }

  /** هر 60 ثانیه config رو دوباره می‌خونه تا تغییرات اعمال بشه */
  private checkReload() {
    if (Date.now() - this.loadedAt > 60_000) this.reload();
  }

  async send(level: 'ERROR' | 'WARN' | 'INFO', text: string) {
    this.checkReload();
    if (!this.config?.enabled) return;
    if (!this.config.levels.includes(level)) return;
    if (!this.config.botToken || this.config.botToken.includes('PUT_YOUR')) return;
    if (!this.config.chatId || this.config.chatId.includes('PUT_YOUR')) return;

    // rate limit
    const now = Date.now();
    const last = this.lastSent[level] || 0;
    if (this.config.rateLimitSeconds > 0 && (now - last) < this.config.rateLimitSeconds * 1000) {
      return;
    }
    this.lastSent[level] = now;

    const host = process.env.COMPUTERNAME || 'server';
    const msg = '\u26A0 Epsay Backend [' + level + ']' + String.fromCharCode(10) + host + ' \u2014 ' + text;

    try {
      const url = 'https://api.telegram.org/bot' + this.config.botToken + '/sendMessage';
      const body = JSON.stringify({ chat_id: this.config.chatId, text: msg });
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
      });
    } catch (e) {
      this.logger.warn('Telegram send failed: ' + (e as Error).message);
    }
  }
}
