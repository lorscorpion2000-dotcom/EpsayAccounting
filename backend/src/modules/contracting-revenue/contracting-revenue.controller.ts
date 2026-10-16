import { Controller, Get, Query, StreamableFile, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ContractingRevenueService } from './contracting-revenue.service';

@ApiTags('Contracting Revenue')
@ApiBearerAuth()
@Controller('contracting-revenue')
export class ContractingRevenueController {
  constructor(private service: ContractingRevenueService) {}

  @Get('summary')
  @RequirePermissions('reports.read')
  summary(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('projectId') projectId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.service.summary({ fromDate, toDate, projectId, clientId });
  }

  @Get('by-project')
  @RequirePermissions('reports.read')
  byProject(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('projectId') projectId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.service.byProject({ fromDate, toDate, projectId, clientId });
  }

  @Get('by-client')
  @RequirePermissions('reports.read')
  byClient(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('projectId') projectId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.service.byClient({ fromDate, toDate, projectId, clientId });
  }

  @Get('by-period')
  @RequirePermissions('reports.read')
  byPeriod(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('projectId') projectId?: string,
    @Query('clientId') clientId?: string,
    @Query('groupBy') groupBy?: 'month' | 'quarter',
  ) {
    return this.service.byPeriod({ fromDate, toDate, projectId, clientId, groupBy });
  }

  @Get('projects-list')
  @RequirePermissions('reports.read')
  projectsList() {
    return this.service.projectsList();
  }

  @Get('clients-list')
  @RequirePermissions('reports.read')
  clientsList() {
    return this.service.clientsList();
  }

  @Get('export.xlsx')
  @RequirePermissions('reports.read')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="contracting-revenue.xlsx"')
  async exportExcel(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('projectId') projectId?: string,
    @Query('clientId') clientId?: string,
  ): Promise<StreamableFile> {
    const buf = await this.service.exportExcel({ fromDate, toDate, projectId, clientId });
    return new StreamableFile(buf);
  }
}
