import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdjustmentIndexService } from './adjustment-index.service';
import { CreateIndexDto, UpdateIndexDto } from './dto/adjustment.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Adjustment Index - شاخص‌های تعدیل')
@ApiBearerAuth()
@Controller('adjustment-indices')
export class AdjustmentIndexController {
  constructor(private service: AdjustmentIndexService) {}

  @Get()
  @RequirePermissions('adjustment.read')
  list(
    @Query('year') year?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.list({
      year: year ? parseInt(year, 10) : undefined,
      category,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get('stats')
  @RequirePermissions('adjustment.read')
  stats() { return this.service.stats(); }

  @Get(':id')
  @RequirePermissions('adjustment.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('adjustment.manage')
  create(@Body() dto: CreateIndexDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('adjustment.manage')
  update(@Param('id') id: string, @Body() dto: UpdateIndexDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('adjustment.manage')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
