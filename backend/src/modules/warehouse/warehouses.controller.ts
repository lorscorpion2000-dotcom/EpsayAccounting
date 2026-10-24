import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';;;;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { Request } from 'express';

interface AuthUser {
  id?: string;
  roles?: string[];
  permissions?: string[];
}

type AuthenticatedRequest = Request & { user?: AuthUser };
type AdminUser = Parameters<SoftDeleteService['adminDelete']>[0]['user'];
@ApiTags('Warehouses - انبارها')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private s: WarehousesService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('warehouse.read')
  findAll(@Query('active') active?: string, @Query('projectId') projectId?: string) {
    return this.s.findAll({
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      projectId,
    });
  }

  @Get(':id')
  @RequirePermissions('warehouse.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('warehouse.create')
  create(@Body() dto: CreateWarehouseDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('warehouse.update')
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('warehouse.delete')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const roles = user?.roles || [];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.s.remove(id, { force: wantForce && isAdmin, userId: user?.id });
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('warehouse.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.adminDelete({
      model: 'warehouse',
      id,
      user,
      reason: body?.reason || '',
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('warehouse.update')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.restore({
      model: 'warehouse',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('warehouse.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'warehouse',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
