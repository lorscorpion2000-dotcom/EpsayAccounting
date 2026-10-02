import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Users - Ú©Ø§Ø±Ø¨Ø±Ø§Ù†')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

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
}