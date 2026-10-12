import { Body, Controller, Delete, Get, Param, Post, Query, Req, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SalesReceiptsService } from './sales-receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';

@ApiTags('Sales Receipts - دریافت از مشتری')
@ApiBearerAuth()
@Controller('sales-receipts')
export class SalesReceiptsController {
  constructor(private service: SalesReceiptsService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'invoiceId', required: false })
  findAll(@Query('customerId') customerId?: string, @Query('invoiceId') invoiceId?: string) {
    return this.service.findAll({ customerId, invoiceId });
  }

  @Post()
  @RequirePermissions('accounting.create')
  receipt(@Body() dto: CreateReceiptDto, @CurrentUser('id') userId: string) {
    return this.service.receipt(dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }


  @Delete(':id/admin')
  @RequirePermissions('salesreceipt.delete')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.service.adminDelete(id, user.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('salesreceipt.delete')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}