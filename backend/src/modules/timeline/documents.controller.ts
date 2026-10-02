import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline Documents - آرشیو نقشه‌ها')
@ApiBearerAuth()
@Controller('timeline/documents')
export class DocumentsController {
  constructor(private s: DocumentsService) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'phase', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('phase') phase?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, phase, search }); }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreateDocumentDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
