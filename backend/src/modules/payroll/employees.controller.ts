import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Employees - پرسنل')
@ApiBearerAuth()
@Controller('payroll/employees')
export class EmployeesController {
  constructor(private s: EmployeesService) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'active', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'department', required: false })
  findAll(
    @Query('active') active?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    return this.s.findAll({
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      type, search, department,
    });
  }

  @Get('stats')
  @RequirePermissions('payroll.read')
  stats() { return this.s.stats(); }

  @Get(':id')
  @RequirePermissions('payroll.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('payroll.create')
  create(@Body() dto: CreateEmployeeDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('payroll.update')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
