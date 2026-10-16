import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;;;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignProjectDto, SetDefaultProjectDto } from './dto/assign-project.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

@ApiTags('Users - کاربران')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private users: UsersService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('settings.read')
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @RequirePermissions('settings.read')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @RequirePermissions('settings.create')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('settings.update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('settings.delete')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }

  // ═══════════════════════════════════════════════════════
  // Project Assignments (P1)
  // ═══════════════════════════════════════════════════════

  @Get(':id/projects')
  @RequirePermissions('settings.read')
  listProjects(@Param('id') id: string) {
    return this.users.listProjects(id);
  }

  @Post(':id/projects')
  @RequirePermissions('settings.update')
  assignProject(
    @Param('id') id: string,
    @Body() body: AssignProjectDto,
    @Req() req: any,
  ) {
    return this.users.assignProject(id, body.projectId, req.user?.id);
  }

  @Delete(':id/projects/:projectId')
  @RequirePermissions('settings.update')
  unassignProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.users.unassignProject(id, projectId);
  }

  @Patch(':id/default-project')
  @RequirePermissions('settings.update')
  setDefaultProject(
    @Param('id') id: string,
    @Body() body: SetDefaultProjectDto,
  ) {
    return this.users.setDefaultProject(id, body.projectId ?? null);
  }
  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('users.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'user',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('users.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'user',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('users.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'user',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}