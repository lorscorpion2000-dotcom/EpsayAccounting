import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\backend\\src\\modules\\audit\\audit.module.ts';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(file, `${file}.bak-${STAMP}`);
console.log(`✅ backup`);

const newContent = `import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { TelegramService } from '../../common/services/telegram.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    TelegramService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
`;

fs.writeFileSync(file, newContent, 'utf8');
console.log('✅ TelegramService به providers اضافه شد');
console.log('\n--- محتوای جدید ---');
console.log(newContent);