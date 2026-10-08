import { Module } from '@nestjs/common';
import { InventoryCountService } from './inventory-count.service';
import { InventoryCountController } from './inventory-count.controller';
import { WarehouseTransferService } from './warehouse-transfer.service';
import { WarehouseTransferController } from './warehouse-transfer.controller';
import { WarehouseModule } from '../warehouse/warehouse.module';

@Module({
  imports: [WarehouseModule],
  controllers: [InventoryCountController, WarehouseTransferController],
  providers: [InventoryCountService, WarehouseTransferService],
  exports: [InventoryCountService, WarehouseTransferService],
})
export class InventoryCountModule {}
