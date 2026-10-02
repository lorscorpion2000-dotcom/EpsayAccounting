import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WarehouseReportsService } from './reports.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Warehouse Reports - گزارشات انبار')
@ApiBearerAuth()
@Controller('warehouse/reports')
export class WarehouseReportsController {
  constructor(private s: WarehouseReportsService) {}

  @Get('kardex')
  @RequirePermissions('warehouse.read')
  @ApiQuery({ name: 'itemId', required: true })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  kardex(
    @Query('itemId') itemId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) { return this.s.kardex({ itemId, warehouseId, fromDate, toDate }); }

  @Get('inventory')
  @RequirePermissions('warehouse.read')
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'type', required: false })
  inventory(@Query('warehouseId') warehouseId?: string, @Query('type') type?: string) {
    return this.s.currentInventory({ warehouseId, type });
  }

  @Get('low-stock')
  @RequirePermissions('warehouse.read')
  @ApiQuery({ name: 'warehouseId', required: false })
  lowStock(@Query('warehouseId') warehouseId?: string) {
    return this.s.lowStock(warehouseId);
  }

  @Get('stats')
  @RequirePermissions('warehouse.read')
  stats() { return this.s.stats(); }
}
