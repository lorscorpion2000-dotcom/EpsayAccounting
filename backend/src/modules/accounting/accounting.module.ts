import { Module } from '@nestjs/common';
import { FiscalYearsService } from './fiscal-years.service';
import { AccountsService } from './accounts.service';
import { JournalsService } from './journals.service';
import { ReportsService } from './reports.service';
import { FiscalYearsController } from './fiscal-years.controller';
import { AccountsController } from './accounts.controller';
import { JournalsController } from './journals.controller';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [
    FiscalYearsController,
    AccountsController,
    JournalsController,
    ReportsController,
  ],
  providers: [
    FiscalYearsService,
    AccountsService,
    JournalsService,
    ReportsService,
  ],
  exports: [
    FiscalYearsService,
    AccountsService,
    JournalsService,
    ReportsService,
  ],
})
export class AccountingModule {}
