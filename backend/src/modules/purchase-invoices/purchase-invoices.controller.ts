import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { UpdatePIItemDto } from './dto/create-purchase-invoice.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import type { AuthRequest } from '../../common/types/auth-request';
import { PurchaseInvoiceStatus } from '@prisma/client';

class FromSourceDto {
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
    @Query('status', new ParseEnumPipe(PurchaseInvoiceStatus, { optional: true })) status?: PurchaseInvoiceStatus,
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
  createFromPO(@Param('poId') poId: string, @Body() dto: FromSourceDto, @CurrentUser('id') userId: string) {
    return this.service.createFromPO(poId, dto, userId);
  }

  @Post('from-gr/:grId')
  @RequirePermissions('accounting.create')
  createFromGR(@Param('grId') grId: string, @Body() dto: FromSourceDto, @CurrentUser('id') userId: string) {
    return this.service.createFromGR(grId, dto, userId);
  }



  @Patch('items/:itemId')
  @RequirePermissions('accounting.update')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdatePIItemDto) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @RequirePermissions('accounting.update')
  deleteItem(@Param('itemId') itemId: string) {
    return this.service.deleteItem(itemId);
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
  @RequirePermissions('accounting.manage')
  async restore(@Param('id') id: string, @Req() req: AuthRequest) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}