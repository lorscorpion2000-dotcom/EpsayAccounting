import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TaxReportsService } from './tax-reports.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Tax Reports - گزارش‌های مالیاتی')
@ApiBearerAuth()
@Controller('tax-reports')
export class TaxReportsController {
  constructor(private service: TaxReportsService) {}

  @Get('vat')
  @RequirePermissions('tax-reports.read')
  vatReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('projectId') projectId?: string,
    @Query('partnerId') partnerId?: string,
  ) {
    return this.service.vatReport({ fromDate, toDate, projectId, partnerId });
  }

  @Get('payroll-tax')
  @RequirePermissions('tax-reports.read')
  payrollTaxReport(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.payrollTaxReport({
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      projectId,
    });
  }

  @Get('insurance')
  @RequirePermissions('tax-reports.read')
  insuranceReport(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.insuranceReport({
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      projectId,
    });
  }
}
