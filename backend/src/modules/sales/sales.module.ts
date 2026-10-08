import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import {
  SalesUnitsController,
  SalesCustomersController,
  SalesContractsController,
  SalesPaymentsController,
} from './sales.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [
    SalesUnitsController,
    SalesCustomersController,
    SalesContractsController,
    SalesPaymentsController,
  ],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
