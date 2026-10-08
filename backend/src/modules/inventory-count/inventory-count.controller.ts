import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryCountService } from './inventory-count.service';
import {
  CreateInvCountDto, UpdateInvCountDto, SetItemsDto,
} from './dto/inventory-count.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory Count - انبارگردانی')
@ApiBearerAuth()
@Controller('inventory-counts')
export class InventoryCountController {
  constructor(private service: InventoryCountService) {}

  @Get()
  @RequirePermissions('inventory-count.read')
  list(
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) { return this.service.list({ warehouseId, status, fromDate, toDate }); }

  @Get(':id')
  @RequirePermissions('inventory-count.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('inventory-count.manage')
  create(@Body() dto: CreateInvCountDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id/items')
  @RequirePermissions('inventory-count.manage')
  setItems(@Param('id') id: string, @Body() dto: SetItemsDto) {
    return this.service.setItems(id, dto);
  }

  @Delete('items/:itemId')
  @RequirePermissions('inventory-count.manage')
  removeItem(@Param('itemId') itemId: string) { return this.service.removeItem(itemId); }

  @Post(':id/confirm')
  @RequirePermissions('inventory-count.manage')
  confirm(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.confirm(id, userId);
  }

  @Post(':id/post')
  @RequirePermissions('inventory-count.manage')
  post(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.post(id, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('inventory-count.manage')
  cancel(@Param('id') id: string) { return this.service.cancel(id); }

  @Delete(':id')
  @RequirePermissions('inventory-count.manage')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
