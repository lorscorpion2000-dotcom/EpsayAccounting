import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { AuditModule } from '../modules/audit/audit.module';
import { SoftDeleteService } from './services/soft-delete.service';

@Global()
@Module({
  imports: [PrismaModule, AuditModule],
  providers: [SoftDeleteService],
  exports: [SoftDeleteService],
})
export class CommonModule {}
