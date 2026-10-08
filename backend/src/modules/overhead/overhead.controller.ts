import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OverheadService } from './overhead.service';
import {
  CreateOverheadDto, UpdateOverheadDto, PreviewDto,
} from './dto/overhead.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Overhead - تسهیم سربار ستاد')
@ApiBearerAuth()
@Controller('overhead-allocations')
export class OverheadController {
  constructor(private service: OverheadService) {}

  @Get()
  @RequirePermissions('overhead.read')
  list(
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('status') status?: string,
  ) { return this.service.list({ fiscalYearId, status }); }

  @Get('stats')
  @RequirePermissions('overhead.read')
  stats(@Query('fiscalYearId') fiscalYearId?: string) {
    return this.service.stats(fiscalYearId);
  }

  @Post('preview')
  @RequirePermissions('overhead.read')
  preview(@Body() dto: PreviewDto) { return this.service.preview(dto); }

  @Get(':id')
  @RequirePermissions('overhead.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('overhead.manage')
  create(@Body() dto: CreateOverheadDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('overhead.manage')
  update(@Param('id') id: string, @Body() dto: UpdateOverheadDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('overhead.manage')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post(':id/post')
  @RequirePermissions('overhead.manage')
  post(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.post(id, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('overhead.manage')
  cancel(@Param('id') id: string) { return this.service.cancel(id); }
}
