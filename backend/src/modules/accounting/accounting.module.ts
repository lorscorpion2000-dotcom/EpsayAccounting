import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { FiscalYearsController } from './fiscal-years.controller';
import { FiscalYearsService } from './fiscal-years.service';
import { JournalsController } from './journals.controller';
import { JournalsService } from './journals.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AdvancedLedgerService } from './reports/advanced-ledger.service';
import { ProjectReportsService } from './reports/project-reports.service';
import { ProjectReportsController } from './reports/project-reports.controller';
import { AdvancedLedgerController } from './reports/advanced-ledger.controller';
import { DetailAccountsService } from './detail-accounts.service';
import { AccountingEngineService } from './engine/accounting-engine.service';
import { AccountMappingController } from './engine/account-mapping.controller';

import { CashFlowService } from './reports/cash-flow.service';
import { CashFlowController } from './reports/cash-flow.controller';
import { VatService } from './reports/vat.service';
import { VatController } from './reports/vat.controller';
import { BudgetVsActualService } from './reports/budget-vs-actual.service';
import { BudgetVsActualController } from './reports/budget-vs-actual.controller';
import { APAgingDetailService } from './reports/ap-aging-detail.service';
import { APAgingDetailController } from './reports/ap-aging-detail.controller';
import { ARAgingDetailService } from './reports/ar-aging-detail.service';
import { ARAgingDetailController } from './reports/ar-aging-detail.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    ARAgingDetailController,
    AdvancedLedgerController,
    ProjectReportsController,
    APAgingDetailController,
    BudgetVsActualController,
    VatController,
    CashFlowController,
    AccountsController,
    FiscalYearsController,
    JournalsController,
    ReportsController,
    AccountMappingController,
  ],
  providers: [
    ARAgingDetailService,
    AdvancedLedgerService,
    ProjectReportsService,
    APAgingDetailService,
    BudgetVsActualService,
    VatService,
    CashFlowService,
    AccountsService,
    FiscalYearsService,
    JournalsService,
    ReportsService,
    DetailAccountsService,
    AccountingEngineService,
  ],
  exports: [
    AccountsService,
    FiscalYearsService,
    JournalsService,
    DetailAccountsService,
    AccountingEngineService,
  ],
})
export class AccountingModule {}