import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Budgets - بودجه')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private budgets: BudgetsService) {}

  @Get()
  @RequirePermissions('projects.read')
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Query('projectId') projectId?: string) {
    return this.budgets.findAll(projectId);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  findOne(@Param('id') id: string) {
    return this.budgets.findOne(id);
  }

  @Post()
  @RequirePermissions('projects.create')
  create(@Body() dto: CreateBudgetDto) {
    return this.budgets.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(@Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgets.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  remove(@Param('id') id: string) {
    return this.budgets.remove(id);
  }
}
