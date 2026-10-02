import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { RejectDto } from '../procurement/dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Goods Receipts - رسیدهای انبار')
@ApiBearerAuth()
@Controller('warehouse/receipts')
export class ReceiptsController {
  constructor(private s: ReceiptsService) {}

  @Get()
  @RequirePermissions('warehouse.read')
  findAll(
    @Query('warehouseId') warehouseId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) { return this.s.findAll({ warehouseId, projectId, status }); }

  @Get(':id')
  @RequirePermissions('warehouse.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('warehouse.create')
  create(@Body() dto: CreateReceiptDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('warehouse.update')
  update(@Param('id') id: string, @Body() dto: UpdateReceiptDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('warehouse.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }

  @Patch(':id/submit')
  @RequirePermissions('warehouse.update')
  submit(@Param('id') id: string) {
    return this.s.submit(id);
  }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.s.reject(id, dto.reason);
  }


  @Patch(':id/post')
  @RequirePermissions('warehouse.update')
  post(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.post(id, userId);
  }
}
