import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { MustChangePasswordGuard } from './common/guards/must-change-password.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TelegramService } from './common/services/telegram.service';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  validateEnv();
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.use(cookieParser());
  app.setGlobalPrefix(config.get<string>('app.apiPrefix') || 'api');

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads/',
  });
  app.enableCors({
    origin: config.get<string[]>('cors.origin'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

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

  // Exception filter سراسری + هشدار تلگرام
  const telegram = new TelegramService();
  app.useGlobalFilters(new AllExceptionsFilter(telegram));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Epsay Accounting API')
    .setDescription('مستندات API پروژه Epsay Accounting')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('app.port') || 3000;
  await app.listen(port);
  logger.log('Server running on http://localhost:' + port + '/api');
  logger.log('Swagger docs at http://localhost:' + port + '/api/docs');
}
bootstrap();