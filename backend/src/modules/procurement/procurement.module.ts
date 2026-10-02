import { Module } from '@nestjs/common';
import { PurchaseRequestsService } from './pr.service';
import { RFQService } from './rfq.service';
import { PurchaseOrdersService } from './po.service';
import { PurchaseRequestsController } from './pr.controller';
import { RFQController } from './rfq.controller';
import { PurchaseOrdersController } from './po.controller';

@Module({
  controllers: [
    PurchaseRequestsController,
    RFQController,
    PurchaseOrdersController,
  ],
  providers: [
    PurchaseRequestsService,
    RFQService,
    PurchaseOrdersService,
  ],
  exports: [
    PurchaseRequestsService,
    RFQService,
    PurchaseOrdersService,
  ],
})
export class ProcurementModule {}
