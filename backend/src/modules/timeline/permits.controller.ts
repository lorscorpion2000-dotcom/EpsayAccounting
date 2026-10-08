import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermitsService } from './permits.service';
import { CreatePermitDto, UpdatePermitDto } from './dto/permit.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline Permits - مجوزها و پروانه‌ها')
@ApiBearerAuth()
@Controller('timeline/permits')
export class PermitsController {
  constructor(private s: PermitsService) {}

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
}
