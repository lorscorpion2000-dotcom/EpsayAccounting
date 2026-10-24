import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupRoot: string;

  constructor(private config: ConfigService) {
    this.backupRoot = this.config.get<string>('BACKUP_DIR') || 'E:/EpsayBackups/db';
  }

  onModuleInit() {
    try {
      if (!existsSync(this.backupRoot)) {
        mkdirSync(this.backupRoot, { recursive: true });
        this.logger.log('Created backup root: ' + this.backupRoot);
      }
    } catch (e) {
      this.logger.error('Failed to create backup root: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ایجاد backup جدید
  // ═══════════════════════════════════════════════════════════
  async createBackup(type: 'MANUAL' | 'AUTO' = 'MANUAL'): Promise<{
    filename: string;
    fullPath: string;
    sizeBytes: number;
    timestamp: string;
  }> {
    const ts = this.timestamp();
    const filename = 'epsay_backup_' + ts + '.dump';
    const fullPath = join(this.backupRoot, filename);

    // parse DATABASE_URL
    const dbUrl = this.config.get<string>('DATABASE_URL') || process.env.DATABASE_URL || '';
    if (!dbUrl) throw new BadRequestException('DATABASE_URL not configured');

    const info = this.parseDbUrl(dbUrl);
    if (!info) throw new BadRequestException('Invalid DATABASE_URL');

    const env = { ...process.env, PGPASSWORD: info.password };
    const cmd = this.resolvePgDump() + ` -h ${info.host} -p ${info.port} -U ${info.user} -d ${info.database} -F c -f "${fullPath}"`;

    this.logger.log('Starting backup (' + type + '): ' + filename);

    try {
      await execAsync(cmd, { env, timeout: 5 * 60 * 1000 });

      if (!existsSync(fullPath)) {
        throw new Error('Backup file was not created');
      }

      const stats = statSync(fullPath);
      this.logger.log('Backup complete: ' + filename + ' (' + this.formatSize(stats.size) + ')');

      // پاک‌سازی خودکار backup‌های قدیمی
      await this.cleanupOldBackups();

      return {
        filename,
        fullPath,
        sizeBytes: stats.size,
        timestamp: ts,
      };
    } catch (e) {
      this.logger.error('Backup failed: ' + (e instanceof Error ? e.message : String(e)));
      // اگر فایل نیمه‌کاره ساخته شده، پاکش کن
      if (existsSync(fullPath)) {
        try { unlinkSync(fullPath); } catch { /* ignore */ }
      }
      throw new BadRequestException('Backup failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // لیست backup‌های موجود
  // ═══════════════════════════════════════════════════════════
  listBackups(): Array<{
    filename: string;
    sizeBytes: number;
    sizeFormatted: string;
    createdAt: string;
  }> {
    if (!existsSync(this.backupRoot)) return [];

    try {
      return readdirSync(this.backupRoot)
        .filter((f) => f.endsWith('.dump') || f.endsWith('.sql') || f.endsWith('.bak'))
        .map((f) => {
          const full = join(this.backupRoot, f);
          const stats = statSync(full);
          return {
            filename: f,
            sizeBytes: stats.size,
            sizeFormatted: this.formatSize(stats.size),
            createdAt: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (e) {
      this.logger.error('Failed to list backups: ' + (e instanceof Error ? e.message : String(e)));
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // پاک کردن backup قدیمی
  // ═══════════════════════════════════════════════════════════
  async deleteBackup(filename: string) {
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }
    const full = join(this.backupRoot, filename);
    if (!existsSync(full)) throw new BadRequestException('Backup not found');
    unlinkSync(full);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // Scheduled backups
  // ═══════════════════════════════════════════════════════════
  @Cron('0 2 * * *', { name: 'daily-backup' })
  async dailyBackup() {
    this.logger.log('Running daily automatic backup...');
    try {
      const r = await this.createBackup('AUTO');
      this.logger.log('Daily backup succeeded: ' + r.filename);
    } catch (e) {
      this.logger.error('Daily backup failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  @Cron('0 3 * * 5', { name: 'weekly-backup' })
  async weeklyBackup() {
    this.logger.log('Running weekly automatic backup...');
    try {
      const r = await this.createBackup('AUTO');
      this.logger.log('Weekly backup succeeded: ' + r.filename);
    } catch (e) {
      this.logger.error('Weekly backup failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // پاک‌سازی خودکار
  // ═══════════════════════════════════════════════════════════
  private async cleanupOldBackups() {
    const retentionDays = 30;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    try {
      const files = readdirSync(this.backupRoot);
      let deleted = 0;
      for (const f of files) {
        if (!f.endsWith('.dump') && !f.endsWith('.sql') && !f.endsWith('.bak')) continue;
        const full = join(this.backupRoot, f);
        const stats = statSync(full);
        if (stats.mtimeMs < cutoff) {
          unlinkSync(full);
          deleted++;
        }
      }
      if (deleted > 0) {
        this.logger.log('Cleaned up ' + deleted + ' old backups (older than ' + retentionDays + ' days)');
      }
    } catch (e) {
      this.logger.error('Cleanup failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════

  private resolvePgDump(): string {
    // 1. Explicit override
    const override = this.config.get<string>('PG_DUMP_PATH') || process.env.PG_DUMP_PATH;
    if (override && existsSync(override)) return '"' + override + '"';

    // 2. Standard Windows install paths (newest first)
    const candidates = [
      'C:/Program Files/PostgreSQL/17/bin/pg_dump.exe',
      'C:/Program Files/PostgreSQL/16/bin/pg_dump.exe',
      'C:/Program Files/PostgreSQL/15/bin/pg_dump.exe',
      'C:/Program Files/PostgreSQL/14/bin/pg_dump.exe',
      'C:/Program Files (x86)/PostgreSQL/17/bin/pg_dump.exe',
      'C:/Program Files (x86)/PostgreSQL/16/bin/pg_dump.exe',
      '/usr/bin/pg_dump',
      '/usr/local/bin/pg_dump',
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        this.logger.log('Using pg_dump at: ' + p);
        return '"' + p + '"';
      }
    }

    // 3. Fallback: rely on PATH
    this.logger.warn('pg_dump not found in standard paths — falling back to PATH');
    return 'pg_dump';
  }

  private timestamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) + '_' +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds());
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  private parseDbUrl(url: string) {
    // postgresql://user:pass@host:port/db?params
    try {
      const u = new URL(url);
      return {
        host: u.hostname || '127.0.0.1',
        port: u.port || '5432',
        user: decodeURIComponent(u.username || 'postgres'),
        password: decodeURIComponent(u.password || ''),
        database: (u.pathname || '').replace(/^\//, '').split('?')[0],
      };
    } catch {
      return null;
    }
  }

  async stats() {
    const list = this.listBackups();
    return {
      backupDir: this.backupRoot,
      total: list.length,
      totalSizeBytes: list.reduce((s, b) => s + b.sizeBytes, 0),
      latest: list[0] || null,
      oldest: list[list.length - 1] || null,
    };
  }
}
