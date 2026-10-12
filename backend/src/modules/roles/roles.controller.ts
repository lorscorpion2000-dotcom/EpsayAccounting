import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';

@ApiTags('Roles - نقش‌ها و مجوزها')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private roles: RolesService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('settings.read')
  findAll() {
    return this.roles.findAll();
  }

  @Get(':id')
  @RequirePermissions('settings.read')
  findOne(@Param('id') id: string) {
    return this.roles.findOne(id);
  }

  @Post()
  @RequirePermissions('settings.create')
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('settings.update')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Patch(':id/permissions')
  @RequirePermissions('settings.update')
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.roles.assignPermissions(id, dto.permissionIds);
  }

  @Delete(':id')
  @RequirePermissions('settings.delete')
  remove(@Param('id') id: string) {
    return this.roles.remove(id);
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('roles.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'role',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('roles.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'role',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('roles.update')
  listDeleted(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.softDelete.listDeleted({
      model: 'role',
      take: take ? parseInt(take, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

}