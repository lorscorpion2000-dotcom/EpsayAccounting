import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FiscalYearsService } from './fiscal-years.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Fiscal Years - سال‌های مالی')
@ApiBearerAuth()
@Controller('fiscal-years')
export class FiscalYearsController {
  constructor(private service: FiscalYearsService) {}

  @Get()
  @RequirePermissions('accounting.read')
  findAll() { return this.service.findAll(); }

  @Get('current')
  @RequirePermissions('accounting.read')
  findCurrent() { return this.service.findCurrent(); }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateFiscalYearDto) { return this.service.create(dto); }

  @Patch(':id/set-current')
  @RequirePermissions('accounting.update')
  setCurrent(@Param('id') id: string) {
    return this.service.setCurrent(id);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: CreateFiscalYearDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/close')
  @RequirePermissions('accounting.update')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  @Patch(':id/reopen')
  @RequirePermissions('accounting.update')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }

  @Get(':id/summary')
  @RequirePermissions('accounting.read')
  summary(@Param('id') id: string) {
    return this.service.summary(id);
  }

  @Patch(':id/generate-closing')
  @RequirePermissions('accounting.update')
  generateClosing(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.generateClosingEntry(id, userId);
  }

  @Patch(':id/generate-opening')
  @RequirePermissions('accounting.update')
  generateOpening(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.generateOpeningEntry(id, userId);
  }
}
