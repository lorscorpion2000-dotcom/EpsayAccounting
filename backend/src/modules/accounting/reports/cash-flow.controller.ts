import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CashFlowService } from './cash-flow.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Reports - Cash Flow')
@ApiBearerAuth()
@Controller('reports/cash-flow')
export class CashFlowController {
  constructor(private service: CashFlowService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  get(@Query('from') from?: string, @Query('to') to?: string) {
    if (!from || !to) throw new BadRequestException('from و to الزامی هستند');
    return this.service.buildReport(from, to);
  }
}