import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Partners - اشخاص')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private partners: PartnersService) {}

  @Get()
  @RequirePermissions('directory.read')
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('type') type?: string, @Query('search') search?: string) {
    return this.partners.findAll(type, search);
  }

  @Get(':id')
  @RequirePermissions('directory.read')
  findOne(@Param('id') id: string) {
    return this.partners.findOne(id);
  }

  @Post()
  @RequirePermissions('directory.create')
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('directory.update')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('directory.delete')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []) as string[];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.partners.remove(id, { force: wantForce && isAdmin });
  }
}
