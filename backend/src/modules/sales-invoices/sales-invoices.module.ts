import { Module } from '@nestjs/common';
import { SalesInvoicesService } from './sales-invoices.service';
import { SalesInvoicesController } from './sales-invoices.controller';
import { SalesReceiptsService } from './sales-receipts.service';
import { SalesReceiptsController } from './sales-receipts.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SalesInvoicesService, SalesReceiptsService],
  controllers: [SalesInvoicesController, SalesReceiptsController],
  exports: [SalesInvoicesService, SalesReceiptsService],
})
export class SalesInvoicesModule {}