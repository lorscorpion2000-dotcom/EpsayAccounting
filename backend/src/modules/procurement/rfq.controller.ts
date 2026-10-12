import { Body, Controller, Get, Param, Patch, Post, Query, Req, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RFQService } from './rfq.service';
import { CreateRFQDto } from './dto/create-rfq.dto';
import { CreateRFQResponseDto } from './dto/create-rfq-response.dto';
import { SelectSupplierDto } from './dto/select-supplier.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';

@ApiTags('RFQ - استعلام‌ها')
@ApiBearerAuth()
@Controller('procurement/rfqs')
export class RFQController {
  constructor(private service: RFQService) {}

  @Get()
  @RequirePermissions('procurement.read')
  @ApiQuery({ name: 'prId', required: false })
  findAll(@Query('prId') prId?: string) { return this.service.findAll({ prId }); }

  @Get(':id')
  @RequirePermissions('procurement.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('procurement.create')
  create(@Body() dto: CreateRFQDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Post('responses')
  @RequirePermissions('procurement.create')
  addResponse(@Body() dto: CreateRFQResponseDto, @CurrentUser('id') userId: string) {
    return this.service.addResponse(dto, userId);
  }

  @Patch('select-supplier')
  @RequirePermissions('procurement.update')
  selectSupplier(@Body() dto: SelectSupplierDto, @CurrentUser('id') userId: string) {
    return this.service.selectSupplier(dto, userId);
  }


  @Delete(':id/admin')
  @RequirePermissions('rfq.delete')
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
  @RequirePermissions('rfq.delete')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}
