import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import type { AuthenticatedRequest } from '../auth/auth.controller';

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
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.budgets.remove(id, userId);
  }

  @Get('deleted/list')
  @RequirePermissions('projects.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.budgets.listDeleted(take ?? 100, skip ?? 0);
  }

  @Delete(':id/admin')
  @RequirePermissions('projects.update')
  adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.budgets.adminDelete(id, req.user?.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('projects.update')
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.budgets.restore(id, userId);
  }
}
