import { Module } from '@nestjs/common';
import { SalesInvoicesService } from './sales-invoices.service';
import { SalesInvoicesController } from './sales-invoices.controller';
import { SalesReceiptsService } from './sales-receipts.service';
import { SalesReceiptsController } from './sales-receipts.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, AccountingModule],
  providers: [SalesInvoicesService, SalesReceiptsService],
  controllers: [SalesInvoicesController, SalesReceiptsController],
  exports: [SalesInvoicesService, SalesReceiptsService],
})
export class SalesInvoicesModule {}