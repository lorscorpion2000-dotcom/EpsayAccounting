import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BudgetVsActualService } from './budget-vs-actual.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Reports - Budget vs Actual')
@ApiBearerAuth()
@Controller('reports/budget-vs-actual')
export class BudgetVsActualController {
  constructor(private service: BudgetVsActualService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  get(
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!projectId) throw new BadRequestException('projectId الزامی است');
    if (!from || !to) throw new BadRequestException('from و to الزامی هستند');
    return this.service.buildReport(projectId, from, to);
  }
}