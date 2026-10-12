import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SalesService } from './sales.service';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CreateSalesUnitDto, UpdateSalesUnitDto } from './dto/create-unit.dto';
import {
  CreateSalesCustomerDto,
  UpdateSalesCustomerDto,
} from './dto/create-customer.dto';
import {
  CreateSalesContractDto,
  UpdateSalesContractDto,
  CancelSalesContractDto,
} from './dto/create-sales-contract.dto';
import { CreateSalesPaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReasonDto } from '../../common/dto';

// ═══════════════════════════════════════════════
// Units
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/units')
export class SalesUnitsController {
  constructor(
    private svc: SalesService,
    private softDelete: SoftDeleteService,
  ) {}

  @Get()
  @RequirePermissions('sales.read')
  list(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.listUnits({ projectId, status, search });
  }

  @Get('deleted/list')
  @RequirePermissions('sales.update')
  listDeleted(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.softDelete.listDeleted({
      model: 'salesUnit',
      take: take ? parseInt(take, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

  @Get(':id')
  @RequirePermissions('sales.read')
  get(@Param('id') id: string) {
    return this.svc.getUnit(id);
  }

  @Post()
  @RequirePermissions('sales.create')
  create(@Body() dto: CreateSalesUnitDto) {
    return this.svc.createUnit(dto);
  }

  @Patch(':id')
  @RequirePermissions('sales.update')
  update(@Param('id') id: string, @Body() dto: UpdateSalesUnitDto) {
    return this.svc.updateUnit(id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('sales.update')
  cancel(@Param('id') id: string) {
    return this.svc.cancelUnit(id);
  }

  @Delete(':id/admin')
  @RequirePermissions('sales.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'salesUnit',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('sales.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'salesUnit',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
}

// ═══════════════════════════════════════════════
// Customers
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/customers')
export class SalesCustomersController {
  constructor(
    private svc: SalesService,
    private softDelete: SoftDeleteService,
  ) {}

  @Get()
  @RequirePermissions('sales.read')
  list(@Query('search') search?: string) {
    return this.svc.listCustomers(search);
  }

  @Get('deleted/list')
  @RequirePermissions('sales.update')
  listDeleted(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.softDelete.listDeleted({
      model: 'salesCustomer',
      take: take ? parseInt(take, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

  @Get(':id')
  @RequirePermissions('sales.read')
  get(@Param('id') id: string) {
    return this.svc.getCustomer(id);
  }

  @Post()
  @RequirePermissions('sales.create')
  create(@Body() dto: CreateSalesCustomerDto) {
    return this.svc.createCustomer(dto);
  }

  @Patch(':id')
  @RequirePermissions('sales.update')
  update(@Param('id') id: string, @Body() dto: UpdateSalesCustomerDto) {
    return this.svc.updateCustomer(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('sales.delete')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []) as string[];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.svc.removeCustomer(id, { force: wantForce && isAdmin });
  }

  @Delete(':id/admin')
  @RequirePermissions('sales.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'salesCustomer',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('sales.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'salesCustomer',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
}

// ═══════════════════════════════════════════════
// Contracts
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/contracts')
export class SalesContractsController {
  constructor(
    private svc: SalesService,
    private softDelete: SoftDeleteService,
  ) {}

  @Get()
  @RequirePermissions('sales.read')
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('unitId') unitId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.svc.listContracts({ status, search, unitId, customerId });
  }

  @Get('summary')
  @RequirePermissions('sales.read')
  summary() {
    return this.svc.summary();
  }

  @Get('deleted/list')
  @RequirePermissions('sales.update')
  listDeleted(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.softDelete.listDeleted({
      model: 'salesContract',
      take: take ? parseInt(take, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

  @Get(':id')
  @RequirePermissions('sales.read')
  get(@Param('id') id: string) {
    return this.svc.getContract(id);
  }

  @Post()
  @RequirePermissions('sales.create')
  create(@Body() dto: CreateSalesContractDto) {
    return this.svc.createContract(dto);
  }

  @Patch(':id')
  @RequirePermissions('sales.update')
  update(@Param('id') id: string, @Body() dto: UpdateSalesContractDto) {
    return this.svc.updateContract(id, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('sales.update')
  activate(@Param('id') id: string) {
    return this.svc.activateContract(id);
  }

  @Post(':id/cancel')
  @RequirePermissions('sales.update')
  cancel(@Param('id') id: string, @Body() dto: CancelSalesContractDto) {
    return this.svc.cancelContract(id, dto.reason);
  }

  @Delete(':id')
  @RequirePermissions('sales.delete')
  removeContract(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []) as string[];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.svc.removeContract(id, { force: wantForce && isAdmin });
  }

  @Delete(':id/admin')
  @RequirePermissions('sales.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'salesContract',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('sales.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'salesContract',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
}

// ═══════════════════════════════════════════════
// Payments (بدون soft-delete)
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/payments')
export class SalesPaymentsController {
  constructor(private svc: SalesService) {}

  @Get()
  @RequirePermissions('sales.read')
  list(@Query('contractId') contractId?: string) {
    return this.svc.listPayments(contractId);
  }

  @Post()
  @RequirePermissions('sales.create')
  create(@Body() dto: CreateSalesPaymentDto) {
    return this.svc.createPayment(dto);
  }
}
