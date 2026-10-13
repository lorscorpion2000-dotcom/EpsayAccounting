import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { SiteOpsModule } from '../site-ops/site-ops.module';
import { PayrollModule } from '../payroll/payroll.module';
import { ClientStatementModule } from '../client-statement/client-statement.module';
import { ApprovalsController } from './approvals.controller';

@Module({
  imports: [SiteOpsModule, PayrollModule, ClientStatementModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
