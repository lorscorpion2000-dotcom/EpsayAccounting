import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VatService } from './vat.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Reports - VAT')
@ApiBearerAuth()
@Controller('reports/vat')
export class VatController {
  constructor(private service: VatService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'projectId', required: false })
  get(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('projectId') projectId?: string,
  ) {
    if (!from || !to) throw new BadRequestException('from و to الزامی هستند');
    return this.service.buildReport(from, to, projectId);
  }
}