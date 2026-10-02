import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JournalsService } from './journals.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { ReverseJournalDto } from './dto/reverse-journal.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Journals - اسناد حسابداری')
@ApiBearerAuth()
@Controller('journals')
export class JournalsController {
  constructor(private service: JournalsService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ fiscalYearId, status, fromDate, toDate, search });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateJournalDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateJournalDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Patch(':id/post')
  @RequirePermissions('accounting.update')
  post(@Param('id') id: string) { return this.service.post(id); }

  @Patch(':id/reverse')
  @RequirePermissions('accounting.update')
  reverse(
    @Param('id') id: string,
    @Body() dto: ReverseJournalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reverse(id, dto.reason, userId);
  }
}
