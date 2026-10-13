import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Expense Categories - دسته‌بندی هزینه‌ها')
@ApiBearerAuth()
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private s: ExpenseCategoriesService) {}

  @Get()
  @RequirePermissions('expense.read')
  @ApiQuery({ name: 'includeInactive', required: false })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.s.findAll(includeInactive === 'true');
  }

  @Get('tree')
  @RequirePermissions('expense.read')
  tree() { return this.s.findTree(); }

  @Get(':id')
  @RequirePermissions('expense.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('expense.create')
  create(@Body() dto: CreateCategoryDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('expense.update')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.s.update(id, dto); }

  @Delete(':id')
  @RequirePermissions('expense.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
