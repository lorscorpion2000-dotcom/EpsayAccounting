import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { PettyCashAccountsService } from './accounts.service';
import { CreatePettyCashAccountDto } from './dto/create-account.dto';
import { UpdatePettyCashAccountDto } from './dto/update-account.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Petty Cash Accounts - حساب‌های تنخواه')
@ApiBearerAuth()
@Controller('petty-cash/accounts')
export class PettyCashAccountsController {
  constructor(private service: PettyCashAccountsService) {}

  @Get()
  @RequirePermissions('petty-cash.read')
  @ApiQuery({ name: 'holderId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'active', required: false })
  findAll(
    @Query('holderId') holderId?: string,
    @Query('projectId') projectId?: string,
    @Query('active') active?: string,
  ) {
    return this.service.findAll({
      holderId, projectId,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('petty-cash.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('petty-cash.create')
  create(@Body() dto: CreatePettyCashAccountDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('petty-cash.update')
  update(@Param('id') id: string, @Body() dto: UpdatePettyCashAccountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('petty-cash.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
