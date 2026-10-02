import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Projects - پروژه‌ها')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.projects.findAll({ status, search });
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  findOne(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  @Post()
  @RequirePermissions('projects.create')
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }
}
