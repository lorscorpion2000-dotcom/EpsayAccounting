import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { ChequesController } from './cheques.controller';
import { ChequesService } from './cheques.service';

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [BankAccountsController, ChequesController],
  providers: [BankAccountsService, ChequesService],
  exports: [BankAccountsService, ChequesService],
})
export class BankModule {}