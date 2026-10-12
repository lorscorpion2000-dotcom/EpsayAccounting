import { Module } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CategoriesService } from './categories.service';
import { ItemsService } from './items.service';
import { StockService } from './stock.service';
import { ReceiptsService } from './receipts.service';
import { IssuesService } from './issues.service';
import { WarehouseReportsService } from './reports.service';

import { WarehousesController } from './warehouses.controller';
import { CategoriesController } from './categories.controller';
import { ItemsController } from './items.controller';
import { ReceiptsController } from './receipts.controller';
import { IssuesController } from './issues.controller';
import { StockController } from './stock.controller';
import { WarehouseReportsController } from './reports.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [
    WarehousesController,
    CategoriesController,
    ItemsController,
    ReceiptsController,
    IssuesController,
    StockController,
    WarehouseReportsController,
  ],
  providers: [
    WarehousesService,
    CategoriesService,
    ItemsService,
    StockService,
    ReceiptsService,
    IssuesService,
    WarehouseReportsService,
  ],
  exports: [
    WarehousesService,
    CategoriesService,
    ItemsService,
    StockService,
    ReceiptsService,
    IssuesService,
    WarehouseReportsService,
  ],
})
export class WarehouseModule {}
