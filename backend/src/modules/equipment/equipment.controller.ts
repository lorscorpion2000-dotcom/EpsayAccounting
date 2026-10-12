import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import {
  CreateEquipmentDto, UpdateEquipmentDto,
  CreateDailyLogDto, UpdateDailyLogDto,
  CreateMaintenanceDto,
} from './dto/equipment.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';

@ApiTags('Equipment - ماشین‌آلات و تجهیزات')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private svc: EquipmentService,
    private softDelete: SoftDeleteService,) {}

  // ═══════════════════════════════════════════
  // EQUIPMENT
  // ═══════════════════════════════════════════
  @Get()
  @RequirePermissions('equipment.read')
  list(
    @Query('search') search?: string,
    @Query('ownership') ownership?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.svc.listEquipments({
      search, ownership, status, projectId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get('stats')
  @RequirePermissions('equipment.read')
  stats() { return this.svc.stats(); }

  @Get(':id')
  @RequirePermissions('equipment.read')
  get(@Param('id') id: string) { return this.svc.getEquipment(id); }

  @Post()
  @RequirePermissions('equipment.create')
  create(@Body() dto: CreateEquipmentDto) { return this.svc.createEquipment(dto); }

  @Patch(':id')
  @RequirePermissions('equipment.update')
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.svc.updateEquipment(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('equipment.delete')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []) as string[];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.svc.removeEquipment(id, { force: wantForce && isAdmin });
  }

  // ═══════════════════════════════════════════
  // DAILY LOGS
  // ═══════════════════════════════════════════
  @Get('logs/list')
  @RequirePermissions('equipment.read')
  listLogs(
    @Query('equipmentId') equipmentId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.svc.listDailyLogs({ equipmentId, projectId, status, fromDate, toDate });
  }

  @Get('logs/:id')
  @RequirePermissions('equipment.read')
  getLog(@Param('id') id: string) { return this.svc.getDailyLog(id); }

  @Post('logs')
  @RequirePermissions('equipment.logs.manage')
  createLog(@Body() dto: CreateDailyLogDto, @CurrentUser('id') userId: string) {
    return this.svc.createDailyLog(dto, userId);
  }

  @Patch('logs/:id')
  @RequirePermissions('equipment.logs.manage')
  updateLog(@Param('id') id: string, @Body() dto: UpdateDailyLogDto) {
    return this.svc.updateDailyLog(id, dto);
  }

  @Delete('logs/:id')
  @RequirePermissions('equipment.logs.manage')
  removeLog(@Param('id') id: string) { return this.svc.removeDailyLog(id); }

  @Patch('logs/:id/confirm')
  @RequirePermissions('equipment.logs.manage')
  confirmLog(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.svc.confirmDailyLog(id, userId); }

  // ═══════════════════════════════════════════
  // MAINTENANCE
  // ═══════════════════════════════════════════
  @Get('maintenances/list')
  @RequirePermissions('equipment.read')
  listMaintenances(
    @Query('equipmentId') equipmentId?: string,
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.svc.listMaintenances({ equipmentId, projectId, type, fromDate, toDate });
  }

  @Get('maintenances/:id')
  @RequirePermissions('equipment.read')
  getMaintenance(@Param('id') id: string) { return this.svc.getMaintenance(id); }

  @Post('maintenances')
  @RequirePermissions('equipment.maintenance.manage')
  createMaintenance(@Body() dto: CreateMaintenanceDto, @CurrentUser('id') userId: string) {
    return this.svc.createMaintenance(dto, userId);
  }

  @Delete('maintenances/:id')
  @RequirePermissions('equipment.maintenance.manage')
  removeMaintenance(@Param('id') id: string) { return this.svc.removeMaintenance(id); }

  // ═══════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════
  @Get('reports/usage')
  @RequirePermissions('equipment.read')
  report(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('projectId') projectId?: string,
    @Query('equipmentId') equipmentId?: string,
  ) {
    return this.svc.report({ fromDate, toDate, projectId, equipmentId });
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('equipment.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'equipment',
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
  @RequirePermissions('equipment.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'equipment',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('equipment.update')
  listDeleted(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.softDelete.listDeleted({
      model: 'equipment',
      take: take ? parseInt(take, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

}