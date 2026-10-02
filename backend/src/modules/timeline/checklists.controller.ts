import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto, UpdateChecklistDto, RejectChecklistDto } from './dto/checklist.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline Checklists - چک‌لیست‌های پیش‌نیاز')
@ApiBearerAuth()
@Controller('timeline/checklists')
export class ChecklistsController {
  constructor(private s: ChecklistsService) {}

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
  remove(@Param('id') id: string) { return this.s.remove(id); }

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
}
