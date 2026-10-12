import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PurchaseRequestsService } from './pr.service';
import { CreatePRDto } from './dto/create-pr.dto';
import { UpdatePRDto } from './dto/update-pr.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';

@ApiTags('Purchase Requests - درخواست‌های خرید')
@ApiBearerAuth()
@Controller('procurement/requests')
export class PurchaseRequestsController {
  constructor(private service: PurchaseRequestsService) {}

  @Get()
  @RequirePermissions('procurement.read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
  ) { return this.service.findAll({ status, projectId, search }); }

  @Get(':id')
  @RequirePermissions('procurement.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('procurement.create')
  create(@Body() dto: CreatePRDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('procurement.update')
  update(@Param('id') id: string, @Body() dto: UpdatePRDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('procurement.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Patch(':id/submit')
  @RequirePermissions('procurement.update')
  submit(@Param('id') id: string) { return this.service.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectDto, @CurrentUser('id') userId: string) {
    return this.service.reject(id, dto.reason, userId);
  }


  @Delete(':id/admin')
  @RequirePermissions('procurement.manage')
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
  @RequirePermissions('procurement.manage')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}
