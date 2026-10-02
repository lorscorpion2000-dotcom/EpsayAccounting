import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Warehouses - انبارها')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private s: WarehousesService) {}

  @Get()
  @RequirePermissions('warehouse.read')
  findAll(@Query('active') active?: string, @Query('projectId') projectId?: string) {
    return this.s.findAll({
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      projectId,
    });
  }

  @Get(':id')
  @RequirePermissions('warehouse.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('warehouse.create')
  create(@Body() dto: CreateWarehouseDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('warehouse.update')
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('warehouse.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
