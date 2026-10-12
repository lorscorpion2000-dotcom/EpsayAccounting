// test/e2e/setup.ts — build a Nest app that mimics main.ts bootstrap (guards/pipes/filters)
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard';
import { MustChangePasswordGuard } from '../../src/common/guards/must-change-password.guard';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { TelegramService } from '../../src/common/services/telegram.service';
import { validateEnv } from '../../src/config/env.validation';
import { APP_GUARD } from '@nestjs/core';

export async function createTestApp(): Promise<NestExpressApplication> {
  validateEnv();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    // Disable throttling in tests (login endpoint is throttled 5/15min)
    .overrideProvider(APP_GUARD)
    .useValue({ canActivate: () => true })
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
  app.useGlobalFilters(new AllExceptionsFilter(new TelegramService()));

  await app.init();
  return app;
}
