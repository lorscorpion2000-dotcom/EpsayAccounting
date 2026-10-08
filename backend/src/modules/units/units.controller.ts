import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Units - \u0648\u0627\u062d\u062f\u0647\u0627\u06cc \u0627\u0646\u062f\u0627\u0632\u0647\u200c\u06af\u06cc\u0631\u06cc')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private svc: UnitsService) {}

  @Get()
  @RequirePermissions('settings.read')
  list(@Query('active') active?: string, @Query('search') search?: string) {
    return this.svc.findAll({ active, search });
  }

  @Get(':id')
  @RequirePermissions('settings.read')
  get(@Param('id') id: string) { return this.svc.findOne(id); }

  @Get(':id/usage')
  @RequirePermissions('settings.read')
  usage(@Param('id') id: string) { return this.svc.usageCount(id); }

  @Post()
  @RequirePermissions('settings.create')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id')
  @RequirePermissions('settings.update')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete(':id')
  @RequirePermissions('settings.delete')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
