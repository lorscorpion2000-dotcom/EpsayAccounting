import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExpenseStatus } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import type { AuthRequest } from '../../common/types/auth-request';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

@ApiTags('Expenses - هزینه‌ها')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private s: ExpensesService) {}

  @Get()
  @RequirePermissions('expense.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status', new ParseEnumPipe(ExpenseStatus, { optional: true })) status?: ExpenseStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, categoryId, status, fromDate, toDate, search }); }

  @Get('stats')
  @RequirePermissions('expense.read')
  stats(@Query('projectId') projectId?: string) { return this.s.stats(projectId); }

  @Get(':id')
  @RequirePermissions('expense.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('expense.create')
  create(@Body() dto: CreateExpenseDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('expense.update')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) { return this.s.update(id, dto); }

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
    @Req() req: AuthRequest,
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

  @Patch(':id/submit')
  @RequirePermissions('expense.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser('id') userId: string) {
    return this.s.reject(id, body.reason, userId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('expense.update')
  cancel(@Param('id') id: string) { return this.s.cancel(id); }
}
