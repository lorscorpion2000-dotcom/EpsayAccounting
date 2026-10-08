import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SubcontractorStatementsService } from './subcontractor-statements.service';
import { CreateSubcontractorStatementDto } from './dto/subcontractor-statement.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Subcontractor Statements - صورت‌وضعیت پیمانکاران')
@ApiBearerAuth()
@Controller('payroll/subcontractor-statements')
export class SubcontractorStatementsController {
  constructor(private s: SubcontractorStatementsService) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'contractorId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('contractorId') contractorId?: string,
    @Query('status') status?: string,
  ) {
    return this.s.findAll({ projectId, contractorId, status });
  }

  @Get('stats')
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'projectId', required: false })
  stats(@Query('projectId') projectId?: string) { return this.s.stats(projectId); }

  @Get(':id')
  @RequirePermissions('payroll.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('payroll.create')
  create(@Body() dto: CreateSubcontractorStatementDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('payroll.update')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSubcontractorStatementDto>,
    @Query('force') force: string | undefined,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []) as string[];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.s.update(id, dto, { force: wantForce && isAdmin });
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []) as string[];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.s.remove(id, { force: wantForce && isAdmin });
  }

  @Patch(':id/submit')
  @RequirePermissions('payroll.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/pay')
  @RequirePermissions('payroll.update')
  pay(@Param('id') id: string) { return this.s.markPaid(id); }
}
