import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Cost Centers - مراکز هزینه')
@ApiBearerAuth()
@Controller('cost-centers')
export class CostCentersController {
  constructor(private service: CostCentersService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'active', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('active') active?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.service.findAll({
      projectId,
      active: active === undefined ? undefined : active === 'true',
      parentId,
    });
  }

  @Get('tree')
  @RequirePermissions('accounting.read')
  tree() { return this.service.tree(); }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateCostCenterDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateCostCenterDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}