import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query } from '@nestjs/common';
import { Req } from '@nestjs/common';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryCountService } from './inventory-count.service';
import { CreateInvCountDto, SetItemsDto } from './dto/inventory-count.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryCountStatus } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth.controller';

@ApiTags('Inventory Count - انبارگردانی')
@ApiBearerAuth()
@Controller('inventory-counts')
export class InventoryCountController {
  constructor(
    private service: InventoryCountService,
    private softDelete: SoftDeleteService,
  ) {}

  @Get()
  @RequirePermissions('inventory-count.read')
  list(
    @Query('warehouseId') warehouseId?: string,
    @Query('status', new ParseEnumPipe(InventoryCountStatus, { optional: true })) status?: InventoryCountStatus,
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
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }

  @Delete(':id/admin')
  @RequirePermissions('inventory-count.manage')
  async adminDelete(@Param('id') id: string, @Body() body: ReasonDto, @Req() req: AuthenticatedRequest) {
    return this.softDelete.adminDelete({
      model: 'inventoryCount',
      id,
      user: req.user!,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('inventory-count.manage')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.softDelete.restore({
      model: 'inventoryCount',
      id,
      user: req.user!,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('inventory-count.manage')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'inventoryCount',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }
}
