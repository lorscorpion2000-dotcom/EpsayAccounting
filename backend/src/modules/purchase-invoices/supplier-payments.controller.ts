import { Body, Controller, Delete, Get, Param, Post, Query, Req, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SupplierPaymentsService } from './supplier-payments.service';
import { PaySupplierDto } from './dto/pay-supplier.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Supplier Payments - پرداخت به تأمین‌کننده')
@ApiBearerAuth()
@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(private service: SupplierPaymentsService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'invoiceId', required: false })
  findAll(
    @Query('supplierId') supplierId?: string,
    @Query('invoiceId') invoiceId?: string,
  ) {
    return this.service.findAll({ supplierId, invoiceId });
  }

  @Post()
  @RequirePermissions('accounting.create')
  pay(@Body() dto: PaySupplierDto, @CurrentUser('id') userId: string) {
    return this.service.pay(dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }


  @Delete(':id/admin')
  @RequirePermissions('supplierpayment.delete')
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
  @RequirePermissions('supplierpayment.delete')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}