import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Accounting Reports - گزارش‌های مالی')
@ApiBearerAuth()
@Controller('accounting/reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('trial-balance')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: true })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  trialBalance(
    @Query('fiscalYearId') fiscalYearId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.trialBalance({ fiscalYearId, fromDate, toDate });
  }

  @Get('ledger')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'accountId', required: true })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  ledger(
    @Query('accountId') accountId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.ledger({ accountId, fromDate, toDate });
  }

  @Get('journal-book')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: true })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  journalBook(
    @Query('fiscalYearId') fiscalYearId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.journalBook({ fiscalYearId, fromDate, toDate });
  }

  @Get('party-ledger')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'partnerId', required: true })
  @ApiQuery({ name: 'fiscalYearId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  partyLedger(
    @Query('partnerId') partnerId: string,
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.partyLedger({ partnerId, fiscalYearId, fromDate, toDate });
  }

  @Get('project-ledger')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'fiscalYearId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  projectLedger(
    @Query('projectId') projectId: string,
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.projectLedger({ projectId, fiscalYearId, fromDate, toDate });
  }

  @Get('ar-aging')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: false })
  @ApiQuery({ name: 'asOfDate', required: false })
  arAging(
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.service.agingReport({ type: 'AR', fiscalYearId, asOfDate });
  }

  @Get('ap-aging')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: false })
  @ApiQuery({ name: 'asOfDate', required: false })
  apAging(
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.service.agingReport({ type: 'AP', fiscalYearId, asOfDate });
  }

  @Get('profit-loss')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: true })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  profitLoss(
    @Query('fiscalYearId') fiscalYearId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.profitLoss({ fiscalYearId, fromDate, toDate });
  }

  @Get('balance-sheet')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: true })
  @ApiQuery({ name: 'asOfDate', required: false })
  balanceSheet(
    @Query('fiscalYearId') fiscalYearId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.service.balanceSheet({ fiscalYearId, asOfDate });
  }

  @Get('detailed-trial-balance')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: true })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  detailedTrialBalance(
    @Query('fiscalYearId') fiscalYearId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.detailedTrialBalance({ fiscalYearId, fromDate, toDate });
  }
}
