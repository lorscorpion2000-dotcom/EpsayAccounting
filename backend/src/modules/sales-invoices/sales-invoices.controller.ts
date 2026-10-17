import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;;;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SalesInvoicesService } from './sales-invoices.service';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { UpdateSalesInvoiceDto } from './dto/update-sales-invoice.dto';
import { UpdateSIItemDto } from './dto/create-sales-invoice.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

@ApiTags('Sales Invoices - فاکتور فروش')
@ApiBearerAuth()
@Controller('sales-invoices')
export class SalesInvoicesController {
  constructor(private service: SalesInvoicesService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('customerId') customerId?: string, @Query('projectId') projectId?: string, @Query('status') status?: string) {
    return this.service.findAll({ customerId, projectId, status });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateSalesInvoiceDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch('items/:itemId')
  @RequirePermissions('accounting.update')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateSIItemDto) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @RequirePermissions('accounting.update')
  deleteItem(@Param('itemId') itemId: string) {
    return this.service.deleteItem(itemId);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateSalesInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post(':id/approve')
  @RequirePermissions('accounting.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('sales.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'salesInvoice',
      id,
      user,
      reason: body?.reason || '',
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('sales.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'salesInvoice',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('sales.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'salesInvoice',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}