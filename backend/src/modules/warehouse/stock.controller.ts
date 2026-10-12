import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { MovementType } from '@prisma/client';

@ApiTags('Stock - موجودی‌ها')
@ApiBearerAuth()
@Controller('warehouse/stock')
export class StockController {
  constructor(private s: StockService) {}

  @Get('by-warehouse')
  @RequirePermissions('warehouse.read')
  @ApiQuery({ name: 'warehouseId', required: true })
  byWarehouse(@Query('warehouseId') warehouseId: string) {
    return this.s.findByWarehouse(warehouseId);
  }

  @Get('by-item')
  @RequirePermissions('warehouse.read')
  @ApiQuery({ name: 'itemId', required: true })
  byItem(@Query('itemId') itemId: string) {
    return this.s.findByItem(itemId);
  }

  @Get('movements')
  @RequirePermissions('warehouse.read')
  movements(
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('type', new ParseEnumPipe(MovementType, { optional: true })) type?: MovementType,
  ) {
    return this.s.movements({ warehouseId, itemId, fromDate, toDate, type });
  }
}
