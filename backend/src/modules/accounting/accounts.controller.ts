import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Accounts - کدینگ حساب‌ها')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private service: AccountsService) {}

  @Get('tree')
  @RequirePermissions('accounting.read')
  findTree() { return this.service.findTree(); }

  @Get('flat')
  @RequirePermissions('accounting.read')
  findAllFlat() { return this.service.findAllFlat(); }

  @Get('postable')
  @RequirePermissions('accounting.read')
  findPostable() { return this.service.findPostable(); }

  @Get('generate-code')
  @RequirePermissions('accounting.create')
  @ApiQuery({ name: 'parentId', required: false })
  generateCode(@Query('parentId') parentId?: string) {
    return this.service.generateCode(parentId).then((code) => ({ code }));
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateAccountDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
