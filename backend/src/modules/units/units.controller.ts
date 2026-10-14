import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

@ApiTags('Units - واحدهای اندازه‌گیری')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private svc: UnitsService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('settings.read')
  list(@Query('active') active?: string, @Query('search') search?: string) {
    return this.svc.findAll({ active, search });
  }

  @Get(':id')
  @RequirePermissions('settings.read')
  get(@Param('id') id: string) { return this.svc.findOne(id); }

  @Get(':id/usage')
  @RequirePermissions('settings.read')
  usage(@Param('id') id: string) { return this.svc.usageCount(id); }

  @Post()
  @RequirePermissions('settings.create')
  create(@Body() dto: CreateUnitDto) { return this.svc.create(dto); }

  @Patch(':id')
  @RequirePermissions('settings.update')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) { return this.svc.update(id, dto); }

  @Delete(':id')
  @RequirePermissions('settings.delete')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user?.id);
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('settings.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'unit',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('settings.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'unit',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('settings.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'unit',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }
}
