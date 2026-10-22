import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SharesService } from './shares.service';
import { CreateShareDto, UpdateShareDto, AddPartnerWithDilutionDto } from './dto/share.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Partner Shares')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('partner-shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get()
  @ApiOperation({ summary: 'لیست سهم‌الشرکه‌ها' })
  findAll(@Query('projectId') projectId?: string) {
    return this.sharesService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات یک سهم‌الشرکه' })
  findOne(@Param('id') id: string) {
    return this.sharesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت سهم جدید' })
  create(@Body() dto: CreateShareDto) {
    return this.sharesService.create(dto);
  }

  @Post('add-with-dilution')
  @ApiOperation({ summary: 'ثبت شریک جدید با رقیق‌سازی پویای سهم شرکا' })
  addWithDilution(@Body() dto: AddPartnerWithDilutionDto) {
    return this.sharesService.addPartnerWithDilution(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش سهم‌الشرکه' })
  update(@Param('id') id: string, @Body() dto: UpdateShareDto) {
    return this.sharesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف سهم‌الشرکه' })
  remove(@Param('id') id: string) {
    return this.sharesService.remove(id);
  }
}
