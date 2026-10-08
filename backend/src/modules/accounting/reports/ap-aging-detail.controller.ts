import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { APAgingDetailService } from './ap-aging-detail.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Reports - AP Aging Detail')
@ApiBearerAuth()
@Controller('reports/ap-aging-detail')
export class APAgingDetailController {
  constructor(private service: APAgingDetailService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'asOf', required: false })
  get(@Query('asOf') asOf?: string) {
    return this.service.buildReport(asOf);
  }
}