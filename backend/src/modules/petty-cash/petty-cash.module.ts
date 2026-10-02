import { Module } from '@nestjs/common';
import { PettyCashAccountsService } from './accounts.service';
import { PettyCashTransactionsService } from './transactions.service';
import { PettyCashRequestsService } from './requests.service';
import { PettyCashAccountsController } from './accounts.controller';
import { PettyCashTransactionsController } from './transactions.controller';
import { PettyCashRequestsController } from './requests.controller';

@Module({
  controllers: [
    PettyCashAccountsController,
    PettyCashTransactionsController,
    PettyCashRequestsController,
  ],
  providers: [
    PettyCashAccountsService,
    PettyCashTransactionsService,
    PettyCashRequestsService,
  ],
  exports: [
    PettyCashAccountsService,
    PettyCashTransactionsService,
    PettyCashRequestsService,
  ],
})
export class PettyCashModule {}
