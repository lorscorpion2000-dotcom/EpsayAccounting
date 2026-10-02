import { Module } from '@nestjs/common';
import { CapitalAccountsService } from './accounts.service';
import { ContributionsService } from './contributions.service';
import { WithdrawalsService } from './withdrawals.service';
import { SharesService } from './shares.service';
import { CapitalReportsService } from './reports.service';

import { CapitalAccountsController } from './accounts.controller';
import { ContributionsController } from './contributions.controller';
import { WithdrawalsController } from './withdrawals.controller';
import { SharesController } from './shares.controller';
import { CapitalReportsController } from './reports.controller';

@Module({
  controllers: [
    CapitalAccountsController,
    ContributionsController,
    WithdrawalsController,
    SharesController,
    CapitalReportsController,
  ],
  providers: [
    CapitalAccountsService,
    ContributionsService,
    WithdrawalsService,
    SharesService,
    CapitalReportsService,
  ],
  exports: [
    CapitalAccountsService,
    ContributionsService,
    WithdrawalsService,
    SharesService,
    CapitalReportsService,
  ],
})
export class PartnerCapitalModule {}
