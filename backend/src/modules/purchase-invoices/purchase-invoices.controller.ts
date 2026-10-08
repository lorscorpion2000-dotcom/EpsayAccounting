import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class FromPODto {
  @IsString() @MaxLength(64) invoiceNumber!: string;
  @IsDateString() invoiceDate!: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

@ApiTags('Purchase Invoices - فاکتور خرید')
@ApiBearerAuth()
@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(private service: PurchaseInvoicesService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('supplierId') supplierId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ supplierId, projectId, status });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreatePurchaseInvoiceDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Post('from-po/:poId')
  @RequirePermissions('accounting.create')
  createFromPO(@Param('poId') poId: string, @Body() dto: FromPODto, @CurrentUser('id') userId: string) {
    return this.service.createFromPO(poId, dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseInvoiceDto) {
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


  @Delete(':id/admin')
  @RequirePermissions('accounting.manage')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.service.adminDelete(id, user.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('accounting.manage')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}