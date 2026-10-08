import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaterialReportService } from './material-report.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Material Report - گزارش مصرف مصالح و بهای واحد')
@ApiBearerAuth()
@Controller('material-report')
export class MaterialReportController {
  constructor(private service: MaterialReportService) {}

  @Get('consumption')
  @RequirePermissions('material-report.read')
  consumption(
    @Query('projectId') projectId?: string,
    @Query('wbsItemId') wbsItemId?: string,
    @Query('itemId') itemId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.consumption({ projectId, wbsItemId, itemId, fromDate, toDate });
  }

  @Get('unit-cost/:projectId')
  @RequirePermissions('material-report.read')
  unitCost(
    @Param('projectId') projectId: string,
    @Query('wbsItemId') wbsItemId?: string,
  ) {
    return this.service.wbsUnitCost(projectId, wbsItemId);
  }
}
