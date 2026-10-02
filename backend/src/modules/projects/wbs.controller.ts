import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { WbsService } from './wbs.service';
import { CreateWbsDto } from './dto/create-wbs.dto';
import { UpdateWbsDto } from './dto/update-wbs.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('WBS - ساختار شکست کار')
@ApiBearerAuth()
@Controller('wbs')
export class WbsController {
  constructor(private wbs: WbsService) {}

  @Get()
  @RequirePermissions('projects.read')
  @ApiQuery({ name: 'projectId', required: true })
  findTree(@Query('projectId') projectId: string) {
    return this.wbs.findTree(projectId);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  findOne(@Param('id') id: string) {
    return this.wbs.findOne(id);
  }

  @Post()
  @RequirePermissions('projects.create')
  create(@Body() dto: CreateWbsDto) {
    return this.wbs.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(@Param('id') id: string, @Body() dto: UpdateWbsDto) {
    return this.wbs.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  remove(@Param('id') id: string) {
    return this.wbs.remove(id);
  }
}
