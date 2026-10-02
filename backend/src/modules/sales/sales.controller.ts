import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
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

// ═══════════════════════════════════════════════
// Units
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/units')
export class SalesUnitsController {
  constructor(private svc: SalesService) {}

  @Get()
  list(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.listUnits({ projectId, status, search });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getUnit(id);
  }

  @Post()
  create(@Body() dto: CreateSalesUnitDto) {
    return this.svc.createUnit(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesUnitDto) {
    return this.svc.updateUnit(id, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.svc.cancelUnit(id);
  }
}

// ═══════════════════════════════════════════════
// Customers
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/customers')
export class SalesCustomersController {
  constructor(private svc: SalesService) {}

  @Get()
  list(@Query('search') search?: string) {
    return this.svc.listCustomers(search);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getCustomer(id);
  }

  @Post()
  create(@Body() dto: CreateSalesCustomerDto) {
    return this.svc.createCustomer(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesCustomerDto) {
    return this.svc.updateCustomer(id, dto);
  }
}

// ═══════════════════════════════════════════════
// Contracts
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/contracts')
export class SalesContractsController {
  constructor(private svc: SalesService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('unitId') unitId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.svc.listContracts({ status, search, unitId, customerId });
  }

  @Get('summary')
  summary() {
    return this.svc.summary();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getContract(id);
  }

  @Post()
  create(@Body() dto: CreateSalesContractDto) {
    return this.svc.createContract(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesContractDto) {
    return this.svc.updateContract(id, dto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.svc.activateContract(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSalesContractDto) {
    return this.svc.cancelContract(id, dto.reason);
  }
}

// ═══════════════════════════════════════════════
// Payments
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/payments')
export class SalesPaymentsController {
  constructor(private svc: SalesService) {}

  @Get()
  list(@Query('contractId') contractId?: string) {
    return this.svc.listPayments(contractId);
  }

  @Post()
  create(@Body() dto: CreateSalesPaymentDto) {
    return this.svc.createPayment(dto);
  }
}
