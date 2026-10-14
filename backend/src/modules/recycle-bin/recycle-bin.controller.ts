import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecycleBinService, RecycleEntity } from './recycle-bin.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Recycle Bin - سوابق حذف')
@ApiBearerAuth()
@Controller('recycle-bin')
export class RecycleBinController {
  constructor(private svc: RecycleBinService) {}

  @Get()
  @RequirePermissions('accounting.manage')
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(@Query('entity') entity?: string, @Query('limit') limit?: string) {
    return this.svc.list(entity || 'all', limit ? parseInt(limit, 10) : 200);
  }

  @Get('entities')
  @RequirePermissions('accounting.manage')
  entities() {
    return this.svc.entities();
  }


  @Get('counts')
  @RequirePermissions('accounting.manage')
  counts() {
    return this.svc.counts();
  }

  @Post(':entity/:id/restore')
  @RequirePermissions('accounting.manage')
  restore(@Param('entity') entity: string, @Param('id') id: string, @Req() _req: any) {
    return this.svc.restore(entity as RecycleEntity, id);
  }
}
