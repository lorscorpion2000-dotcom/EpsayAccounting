import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PurchaseOrdersService } from './po.service';
import { CreatePODto, UpdatePOItemDto } from './dto/create-po.dto';
import { UpdatePODto } from './dto/update-po.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import type { AuthRequest } from '../../common/types/auth-request';
import { POStatus } from '@prisma/client';

@ApiTags('Purchase Orders - دستورات خرید')
@ApiBearerAuth()
@Controller('procurement/orders')
export class PurchaseOrdersController {
  constructor(private service: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions('procurement.read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('status', new ParseEnumPipe(POStatus, { optional: true })) status?: POStatus,
    @Query('projectId') projectId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
  ) { return this.service.findAll({ status, projectId, supplierId, search }); }

  @Get(':id')
  @RequirePermissions('procurement.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('procurement.create')
  create(@Body() dto: CreatePODto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('procurement.update')
  update(@Param('id') id: string, @Body() dto: UpdatePODto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('procurement.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Patch('items/:itemId')
  @RequirePermissions('procurement.update')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePOItemDto,
  ) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @RequirePermissions('procurement.update')
  deleteItem(@Param('itemId') itemId: string) {
    return this.service.deleteItem(itemId);
  }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Patch(':id/send')
  @RequirePermissions('procurement.update')
  send(@Param('id') id: string) { return this.service.send(id); }


  @Delete(':id/admin')
  @RequirePermissions('procurement.manage')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthRequest,
  ) {
    const user = req.user || {};
    return this.service.adminDelete(id, user.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('procurement.manage')
  async restore(@Param('id') id: string, @Req() req: AuthRequest) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}
