import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SiteOpsService } from './site-ops.service';
import { DailyReportForwarderService } from './daily-report-forwarder.service';
import { CreateDailyReportDto } from './dto/create-report.dto';
import { UpdateDailyReportDto } from './dto/create-report.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Site Operations - عملیات کارگاه')
@ApiBearerAuth()
@Controller('site-ops/daily-reports')
export class SiteOpsController {
  constructor(
    private s: SiteOpsService,
    private forwarder: DailyReportForwarderService,
  ) {}

  @Get()
  @RequirePermissions('site-ops.read')
  findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) { return this.s.findAll({ projectId, status, fromDate, toDate }); }

  @Get('stats')
  @RequirePermissions('site-ops.read')
  @ApiQuery({ name: 'projectId', required: false })
  stats(@Query('projectId') projectId?: string) { return this.s.stats(projectId); }

  @Get(':id/sections')
  @RequirePermissions('site-ops.read')
  listSections(@Param('id') id: string) { return this.s.listSections(id); }

  @Get(':id/sections/summary')
  @RequirePermissions('site-ops.read')
  sectionsSummary(@Param('id') id: string) { return this.s.sectionsSummary(id); }

  @Patch(':id/sections/:type/approve')
  @RequirePermissions('approvals.update')
  approveSection(
    @Param('id') id: string,
    @Param('type') type: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.s.approveSection(id, type, userId);
  }

  @Patch(':id/sections/:type/reject')
  @RequirePermissions('approvals.update')
  rejectSection(
    @Param('id') id: string,
    @Param('type') type: string,
    @Body() body: { reason: string },
  ) {
    return this.s.rejectSection(id, type, body?.reason || '');
  }

  @Get('forwardings/failed')
  @RequirePermissions('approvals.read')
  listFailedForwardings(@Query('limit') limit?: string) {
    return this.forwarder.getFailedForwardings(limit ? Number(limit) : 100);
  }

  @Post('forwardings/:id/retry')
  @RequirePermissions('approvals.update')
  retryForwarding(@Param('id') id: string) {
    return this.forwarder.retryForwarding(id);
  }

  @Get(':id')
  @RequirePermissions('site-ops.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }


  @Post()
  @RequirePermissions('site-ops.create')
  create(@Body() dto: CreateDailyReportDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('site-ops.update')
  update(@Param('id') id: string, @Body() dto: UpdateDailyReportDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('site-ops.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }

  @Patch(':id/submit')
  @RequirePermissions('site-ops.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.s.reject(id, dto.reason);
  }
}
