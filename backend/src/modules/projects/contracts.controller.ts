import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Contracts - قراردادها')
@ApiBearerAuth()
@Controller('project-contracts')
export class ContractsController {
  constructor(private contracts: ContractsService) {}

  @Get()
  @RequirePermissions('projects.read')
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Query('projectId') projectId?: string) {
    return this.contracts.findAll(projectId);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  findOne(@Param('id') id: string) {
    return this.contracts.findOne(id);
  }

  @Post()
  @RequirePermissions('projects.create')
  create(@Body() dto: CreateContractDto) {
    return this.contracts.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contracts.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  remove(@Param('id') id: string) {
    return this.contracts.remove(id);
  }
}
