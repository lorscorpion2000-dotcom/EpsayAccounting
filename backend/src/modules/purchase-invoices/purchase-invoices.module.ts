import { Module } from '@nestjs/common';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, AccountingModule],
  providers: [PurchaseInvoicesService, SupplierPaymentsService],
  controllers: [PurchaseInvoicesController, SupplierPaymentsController],
  exports: [PurchaseInvoicesService, SupplierPaymentsService],
})
export class PurchaseInvoicesModule {}