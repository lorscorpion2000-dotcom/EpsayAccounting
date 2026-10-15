import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

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
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.remove(id, userId);
  }

  @Get('deleted/list')
  @RequirePermissions('expense.delete')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.s.listDeleted(take ?? 100, skip ?? 0);
  }

  @Delete(':id/admin')
  @RequirePermissions('expense.delete')
  adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    return this.s.adminDelete(id, req.user?.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('expense.delete')
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.restore(id, userId);
  }
}
