// test/e2e/setup.ts — build a Nest app that mimics main.ts bootstrap (guards/pipes/filters)
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/modules/auth/auth.service';
import { BackupService } from '../../src/modules/backup/backup.service';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard';
import { MustChangePasswordGuard } from '../../src/common/guards/must-change-password.guard';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { TelegramService } from '../../src/common/services/telegram.service';
import { validateEnv } from '../../src/config/env.validation';
import { APP_GUARD } from '@nestjs/core';

export async function createTestApp(): Promise<NestExpressApplication> {
  // تنظیم کامل تمام متغیرهای محیطی مورد نیاز تست‌ها
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  if (!process.env.BACKUP_DIR) process.env.BACKUP_DIR = './test-backups';
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-jwt-secret-key-1234567890';
  if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-1234567890';
  if (!process.env.CONFIG_ENCRYPTION_KEY) process.env.CONFIG_ENCRYPTION_KEY = '12345678901234567890123456789012';

  // تنظیم متغیرهای محیطی پیش‌فرض برای تست‌های E2E جهت جلوگیری از خطای ConfigService/BackupService
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/epsay_test?schema=public';
  }
  if (!process.env.BACKUP_DIR) {
    process.env.BACKUP_DIR = './test-backups';
  }
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  validateEnv();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    // Disable throttling in tests (login endpoint is throttled 5/15min)
    .overrideProvider(APP_GUARD)
    .useValue({ canActivate: () => true })
    // Disable backups in E2E: avoid pg_dump + ConfigService DI issues
    .overrideProvider(BackupService)
    .useValue({
      createBackup: async () => {
        return {
          filename: 'test.dump',
          fullPath: 'test.dump',
          sizeBytes: 0,
          timestamp: new Date().toISOString(),
        };
      },
    })
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  const reflector = app.get(Reflector);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new PermissionsGuard(reflector),
    new MustChangePasswordGuard(reflector),
  );
    const telegram = app.get(TelegramService);
  app.useGlobalFilters(new AllExceptionsFilter(telegram));

  // Sanity check: AuthService must be resolvable from DI container
  if (process.env.NODE_ENV === 'test') {
    const authSvc = app.get(AuthService, { strict: false });
    if (!authSvc) throw new Error('E2E setup: AuthService not resolved from DI');
  }

  await app.init();
  return app;
}
