import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Categories - دسته‌بندی کالا')
@ApiBearerAuth()
@Controller('warehouse/categories')
export class CategoriesController {
  constructor(private s: CategoriesService) {}

  @Get()
  @RequirePermissions('warehouse.read')
  findAll() { return this.s.findAll(); }

  @Get('tree')
  @RequirePermissions('warehouse.read')
  findTree() { return this.s.findTree(); }

  @Get(':id')
  @RequirePermissions('warehouse.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('warehouse.create')
  create(@Body() dto: CreateCategoryDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('warehouse.update')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('warehouse.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
