import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdvancedLedgerService } from './advanced-ledger.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Advanced Ledger - دفتر معین پیشرفته')
@ApiBearerAuth()
@Controller('accounting/advanced-ledger')
export class AdvancedLedgerController {
  constructor(private service: AdvancedLedgerService) {}

  @Get('report')
  @RequirePermissions('accounting.reports.read')
  report(
    @Query('accountId') accountId?: string,
    @Query('accountCodePrefix') accountCodePrefix?: string,
    @Query('projectId') projectId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('costCenterId') costCenterId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('includeSubAccounts') includeSubAccounts?: string,
  ) {
    return this.service.report({
      accountId, accountCodePrefix, projectId, partnerId, costCenterId,
      fromDate: fromDate || '', toDate: toDate || '',
      includeSubAccounts: includeSubAccounts === 'true',
    });
  }

  @Get('profit-loss')
  @RequirePermissions('accounting.reports.read')
  profitLoss(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.profitLossByPeriod({ fromDate, toDate, projectId });
  }
}
