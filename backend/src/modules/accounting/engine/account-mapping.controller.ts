import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Account Mappings - نگاشت حساب‌ها')
@ApiBearerAuth()
@Controller('accounting/mappings')
export class AccountMappingController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('accounting.read')
  list() {
    return this.prisma.accountMapping.findMany({
      include: {
        debitAccount: { select: { id: true, code: true, name: true } },
        creditAccount: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  get(@Param('id') id: string) {
    return this.prisma.accountMapping.findUnique({
      where: { id },
      include: { debitAccount: true, creditAccount: true },
    });
  }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: any) {
    return this.prisma.accountMapping.create({ data: dto });
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.accountMapping.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  async remove(@Param('id') id: string) {
    await this.prisma.accountMapping.delete({ where: { id } });
    return { success: true };
  }
}