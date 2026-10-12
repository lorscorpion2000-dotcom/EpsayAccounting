import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermitsService } from './permits.service';
import { CreatePermitDto, UpdatePermitDto } from './dto/permit.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';

@ApiTags('Timeline Permits - مجوزها و پروانه‌ها')
@ApiBearerAuth()
@Controller('timeline/permits')
export class PermitsController {
  constructor(private s: PermitsService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, status, search }); }

  @Get('expiring')
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'days', required: false })
  getExpiring(@Query('days') days?: string) {
    return this.s.getExpiring(days ? parseInt(days, 10) : 60);
  }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreatePermitDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdatePermitDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string, @CurrentUser() _user: any) {
    return this.s.remove(id, { force: true });
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('timeline.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'permit',
      id,
      user,
      reason: body?.reason || '',
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('timeline.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'permit',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('timeline.update')
  listDeleted(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.softDelete.listDeleted({
      model: 'permit',
      take: take ? parseInt(take, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

}
