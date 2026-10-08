import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WarehouseTransferService } from './warehouse-transfer.service';
import {
  CreateTransferDto, UpdateTransferDto,
} from './dto/inventory-count.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Warehouse Transfer - انتقال بین کارگاه‌ها')
@ApiBearerAuth()
@Controller('warehouse-transfers')
export class WarehouseTransferController {
  constructor(private service: WarehouseTransferService) {}

  @Get()
  @RequirePermissions('warehouse-transfer.read')
  list(
    @Query('fromWarehouseId') fromWarehouseId?: string,
    @Query('toWarehouseId') toWarehouseId?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) { return this.service.list({ fromWarehouseId, toWarehouseId, status, projectId }); }

  @Get(':id')
  @RequirePermissions('warehouse-transfer.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('warehouse-transfer.manage')
  create(@Body() dto: CreateTransferDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('warehouse-transfer.manage')
  update(@Param('id') id: string, @Body() dto: UpdateTransferDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/send')
  @RequirePermissions('warehouse-transfer.manage')
  send(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.send(id, userId);
  }

  @Post(':id/receive')
  @RequirePermissions('warehouse-transfer.manage')
  receive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.receive(id, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('warehouse-transfer.manage')
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.cancel(id, userId);
  }

  @Delete(':id')
  @RequirePermissions('warehouse-transfer.manage')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
