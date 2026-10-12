import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { SiteOpsModule } from '../site-ops/site-ops.module';
import { ApprovalsController } from './approvals.controller';

@Module({
  imports: [SiteOpsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
