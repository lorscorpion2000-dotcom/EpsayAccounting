import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OperationalReportsService } from './operational-reports.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Operational Reports - گزارش‌های عملیاتی')
@ApiBearerAuth()
@Controller('operational-reports')
export class OperationalReportsController {
  constructor(private service: OperationalReportsService) {}

  @Get('equipment-efficiency')
  @RequirePermissions('operational-reports.read')
  equipmentEfficiency(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('projectId') projectId?: string,
    @Query('equipmentId') equipmentId?: string,
  ) {
    return this.service.equipmentEfficiency({ fromDate, toDate, projectId, equipmentId });
  }

  @Get('subcontractor-performance')
  @RequirePermissions('operational-reports.read')
  subcontractorPerformance(
    @Query('projectId') projectId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.subcontractorPerformance({ projectId, fromDate, toDate });
  }

  @Get('warehouse-discrepancy')
  @RequirePermissions('operational-reports.read')
  warehouseDiscrepancy(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.service.warehouseDiscrepancy({ fromDate, toDate, warehouseId, itemId });
  }
}
