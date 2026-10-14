import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaterialPriceDiffService } from './material-price-diff.service';
import { CreateMPDDto } from './dto/adjustment.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import { AdjustmentStatus } from '@prisma/client';

@ApiTags('Material Price Diff - مابه‌التفاوت مصالح')
@ApiBearerAuth()
@Controller('material-price-diffs')
export class MaterialPriceDiffController {
  constructor(private service: MaterialPriceDiffService) {}

  @Get()
  @RequirePermissions('adjustment.read')
  list(
    @Query('projectId') projectId?: string,
    @Query('status', new ParseEnumPipe(AdjustmentStatus, { optional: true })) status?: AdjustmentStatus,
    @Query('materialType') materialType?: string,
  ) { return this.service.list({ projectId, status, materialType }); }

  @Get('stats')
  @RequirePermissions('adjustment.read')
  stats() { return this.service.stats(); }

  @Get(':id')
  @RequirePermissions('adjustment.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('adjustment.manage')
  create(@Body() dto: CreateMPDDto) { return this.service.create(dto); }

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
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user?.id);
  }

  @Get('deleted/list')
  @RequirePermissions('adjustment.manage')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.service.listDeleted(take ?? 100, skip ?? 0);
  }


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
