import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CapitalReportsService } from './reports.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Capital Reports - گزارش‌های سرمایه')
@ApiBearerAuth()
@Controller('partner-capital/reports')
export class CapitalReportsController {
  constructor(private s: CapitalReportsService) {}

  @Get('balance-sheet')
  @RequirePermissions('partners.read')
  balanceSheet() { return this.s.balanceSheet(); }

  @Get('partner-statement/:partnerId')
  @RequirePermissions('partners.read')
  partnerStatement(@Param('partnerId') partnerId: string) {
    return this.s.partnerStatement(partnerId);
  }
}
