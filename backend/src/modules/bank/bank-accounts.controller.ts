import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Bank Accounts - حساب‌های بانکی')
@ApiBearerAuth()
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private service: BankAccountsService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'active', required: false })
  findAll(@Query('active') active?: string) {
    return this.service.findAll({
      active: active === undefined ? undefined : active === 'true',
    });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateBankAccountDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}