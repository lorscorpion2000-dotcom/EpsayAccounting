import { Body, Controller, Delete, Get, Param, Post, Query, Req, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdjustmentService } from './adjustment.service';
import { CalculateAdjDto } from './dto/adjustment.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';

@ApiTags('Adjustment - تعدیل صورت‌وضعیت')
@ApiBearerAuth()
@Controller('adjustments')
export class AdjustmentController {
  constructor(private service: AdjustmentService) {}

  @Get()
  @RequirePermissions('adjustment.read')
  list(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) { return this.service.list({ projectId, status, category }); }

  @Get(':id')
  @RequirePermissions('adjustment.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post('calculate')
  @RequirePermissions('adjustment.manage')
  calculate(@Body() dto: CalculateAdjDto) { return this.service.calculate(dto); }

  @Post(':id/confirm')
  @RequirePermissions('adjustment.manage')
  confirm(@Param('id') id: string) { return this.service.confirm(id); }

  @Post(':id/post')
  @RequirePermissions('adjustment.manage')
  post(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.post(id, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('adjustment.manage')
  cancel(@Param('id') id: string) { return this.service.cancel(id); }

  @Delete(':id')
  @RequirePermissions('adjustment.manage')
  remove(@Param('id') id: string) { return this.service.remove(id); }


  @Delete(':id/admin')
  @RequirePermissions('adjustment.delete')
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
  @RequirePermissions('adjustment.delete')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}
