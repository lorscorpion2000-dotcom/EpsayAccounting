import { Module } from '@nestjs/common';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { PurchaseInvoicesCrudService } from './services/purchase-invoices-crud.service';
import { PurchaseInvoicesApproveService } from './services/purchase-invoices-approve.service';
import { PurchaseInvoicesSoftDeleteService } from './services/purchase-invoices-soft-delete.service';

@Module({
  imports: [PrismaModule, AccountingModule],
  providers: [
    PurchaseInvoicesService,
    SupplierPaymentsService,
    PurchaseInvoicesCrudService,
    PurchaseInvoicesApproveService,
    PurchaseInvoicesSoftDeleteService,
  ],
  controllers: [PurchaseInvoicesController, SupplierPaymentsController],
  exports: [PurchaseInvoicesService, SupplierPaymentsService],
})
export class PurchaseInvoicesModule {}
