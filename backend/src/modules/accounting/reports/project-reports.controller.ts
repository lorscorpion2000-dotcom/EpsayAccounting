import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ProjectReportsService } from './project-reports.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Reports - Project (گزارشات پروژه)')
@ApiBearerAuth()
@Controller('reports/project')
export class ProjectReportsController {
  constructor(private s: ProjectReportsService) {}

  @Get(':projectId')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getAll(
    @Param('projectId') projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.s.getAll(projectId, from, to);
  }
}
