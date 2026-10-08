import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ARAgingDetailService } from './ar-aging-detail.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Reports - AR Aging Detail')
@ApiBearerAuth()
@Controller('reports/ar-aging-detail')
export class ARAgingDetailController {
  constructor(private service: ARAgingDetailService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'asOf', required: false })
  get(@Query('asOf') asOf?: string) {
    return this.service.buildReport(asOf);
  }
}