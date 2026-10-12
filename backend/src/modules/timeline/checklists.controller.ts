import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';;;;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto, UpdateChecklistDto, RejectChecklistDto } from './dto/checklist.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { ChecklistStatus, ChecklistType } from '@prisma/client';

@ApiTags('Timeline Checklists - چک‌لیست‌های پیش‌نیاز')
@ApiBearerAuth()
@Controller('timeline/checklists')
export class ChecklistsController {
  constructor(private s: ChecklistsService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type', new ParseEnumPipe(ChecklistType, { optional: true })) type?: ChecklistType,
    @Query('status', new ParseEnumPipe(ChecklistStatus, { optional: true })) status?: ChecklistStatus,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, status, search }); }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreateChecklistDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdateChecklistDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string, @CurrentUser() _user: any) {
    return this.s.remove(id, { force: true });
  }

  @Patch(':id/submit')
  @RequirePermissions('timeline.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectChecklistDto) {
    return this.s.reject(id, dto.reason);
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
      model: 'phaseChecklist',
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
      model: 'phaseChecklist',
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
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'phaseChecklist',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
