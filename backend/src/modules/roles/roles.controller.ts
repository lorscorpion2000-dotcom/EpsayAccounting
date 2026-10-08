import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Roles - نقش‌ها و مجوزها')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private roles: RolesService) {}

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
}