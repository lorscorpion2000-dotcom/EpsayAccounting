import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Items - کالاها')
@ApiBearerAuth()
@Controller('warehouse/items')
export class ItemsController {
  constructor(private s: ItemsService) {}

  @Get()
  @RequirePermissions('warehouse.read')
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ type, categoryId, search }); }

  @Get(':id')
  @RequirePermissions('warehouse.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('warehouse.create')
  create(@Body() dto: CreateItemDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('warehouse.update')
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('warehouse.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
