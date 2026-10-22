import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SharesService } from './shares.service';
import { CreateShareDto, UpdateShareDto, AddPartnerWithDilutionDto } from './dto/share.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Partner Shares')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('partner-capital/shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get()
  @RequirePermissions('partner-capital.read')
  @ApiOperation({ summary: 'لیست سهم‌الشرکه‌ها' })
  findAll(@Query('projectId') projectId?: string) {
    return this.sharesService.findAll(projectId);
  }

  @Get(':id')
  @RequirePermissions('partner-capital.read')
  @ApiOperation({ summary: 'جزئیات یک سهم‌الشرکه' })
  findOne(@Param('id') id: string) {
    return this.sharesService.findOne(id);
  }

  @Post()
  @RequirePermissions('partner-capital.manage')
  @ApiOperation({ summary: 'ثبت سهم جدید' })
  create(@Body() dto: CreateShareDto) {
    return this.sharesService.create(dto);
  }

  @Post('add-with-dilution')
  @RequirePermissions('partner-capital.manage')
  @ApiOperation({ summary: 'ثبت شریک جدید با رقیق‌سازی پویای سهم شرکا' })
  addWithDilution(@Body() dto: AddPartnerWithDilutionDto) {
    return this.sharesService.addPartnerWithDilution(dto);
  }

  @Patch(':id')
  @RequirePermissions('partner-capital.manage')
  @ApiOperation({ summary: 'ویرایش سهم‌الشرکه' })
  update(@Param('id') id: string, @Body() dto: UpdateShareDto) {
    return this.sharesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('partner-capital.manage')
  @ApiOperation({ summary: 'حذف سهم‌الشرکه' })
  remove(@Param('id') id: string) {
    return this.sharesService.remove(id);
  }
}
