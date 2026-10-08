import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FixedAssetsService } from './fixed-assets.service';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import { RunDepreciationDto } from './dto/run-depreciation.dto';
import { DisposeFixedAssetDto } from './dto/dispose-fixed-asset.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Fixed Assets - دارایی‌های ثابت')
@ApiBearerAuth()
@Controller('fixed-assets')
export class FixedAssetsController {
  constructor(private service: FixedAssetsService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Query('status') status?: string, @Query('projectId') projectId?: string) {
    return this.service.findAll({ status, projectId });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateFixedAssetDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateFixedAssetDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get('reports/disposals')
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getDisposals(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getDisposals(from, to);
  }

  @Get(':id/schedule')
  @RequirePermissions('accounting.read')
  getSchedule(@Param('id') id: string) {
    return this.service.getSchedule(id);
  }
  @Post('run-depreciation')
  @RequirePermissions('accounting.create')
  runDepreciation(@Body() dto: RunDepreciationDto, @CurrentUser('id') userId: string) {
    return this.service.runMonthlyDepreciation(dto.year, dto.month, userId);
  }

  @Post(':id/dispose')
  @RequirePermissions('accounting.update')
  dispose(@Param('id') id: string, @Body() dto: DisposeFixedAssetDto, @CurrentUser('id') userId: string) {
    return this.service.dispose(id, dto, userId);
  }
}