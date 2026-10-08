import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PayrollTaxService } from './payroll-tax.service';
import { CreateTaxSettingDto, UpdateTaxSettingDto } from './dto/payroll-tax.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Payroll Tax Settings - تنظیمات مالیات حقوق')
@ApiBearerAuth()
@Controller('payroll/tax-settings')
export class PayrollTaxController {
  constructor(private s: PayrollTaxService) {}

  @Get()
  @RequirePermissions('payroll.read')
  list() { return this.s.list(); }

  @Get('active')
  @RequirePermissions('payroll.read')
  getActive() { return this.s.getActive(); }

  @Get('by-year/:year')
  @RequirePermissions('payroll.read')
  getByYear(@Param('year') year: string) { return this.s.getByYear(Number(year)); }

  @Get('calculate')
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'grossSalary', required: true })
  @ApiQuery({ name: 'year', required: false })
  calculate(
    @Query('grossSalary') grossSalary: string,
    @Query('year') year?: string,
  ) {
    return this.s.calculateTax(Number(grossSalary), year ? Number(year) : undefined);
  }

  @Post()
  @RequirePermissions('payroll.create')
  create(@Body() dto: CreateTaxSettingDto) { return this.s.create(dto); }

  @Post('seed-default')
  @RequirePermissions('payroll.create')
  seedDefault() { return this.s.seedDefault(); }

  @Patch(':id')
  @RequirePermissions('payroll.update')
  update(@Param('id') id: string, @Body() dto: UpdateTaxSettingDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
