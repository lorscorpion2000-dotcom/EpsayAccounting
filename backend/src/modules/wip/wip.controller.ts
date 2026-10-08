import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WipService } from './wip.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('WIP - کار در جریان ساخت')
@ApiBearerAuth()
@Controller('wip')
export class WipController {
  constructor(private service: WipService) {}

  @Get('overview')
  @RequirePermissions('wip.read')
  overview() { return this.service.overview(); }

  @Get('project/:id')
  @RequirePermissions('wip.read')
  projectWip(@Param('id') id: string) { return this.service.projectWip(id); }

  @Get('s-curve/:id')
  @RequirePermissions('wip.read')
  sCurve(@Param('id') id: string) { return this.service.sCurve(id); }
}
