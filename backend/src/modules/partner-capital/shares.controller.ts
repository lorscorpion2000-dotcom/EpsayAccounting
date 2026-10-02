import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SharesService } from './shares.service';
import { CreateShareDto, UpdateShareDto } from './dto/share.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Project Partner Shares - سهم‌الشرکه پروژه‌ها')
@ApiBearerAuth()
@Controller('partner-capital/shares')
export class SharesController {
  constructor(private s: SharesService) {}

  @Get()
  @RequirePermissions('partners.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'partnerId', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('partnerId') partnerId?: string,
  ) { return this.s.findAll({ projectId, partnerId }); }

  @Get(':id')
  @RequirePermissions('partners.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('partners.create')
  create(@Body() dto: CreateShareDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('partners.update')
  update(@Param('id') id: string, @Body() dto: UpdateShareDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('partners.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
