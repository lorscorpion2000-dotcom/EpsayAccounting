import {
  Body, Controller, Delete, Get, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Attachments - پیوست‌ها')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private svc: AttachmentsService) {}

  @Get()
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.svc.list(entityType, entityId);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.createMany(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
