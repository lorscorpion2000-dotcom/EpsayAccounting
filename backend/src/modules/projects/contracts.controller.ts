import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import type { AuthenticatedRequest } from '../auth/auth.controller';

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
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.contracts.remove(id, userId);
  }

  @Get('deleted/list')
  @RequirePermissions('projects.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.contracts.listDeleted(take ?? 100, skip ?? 0);
  }

  @Delete(':id/admin')
  @RequirePermissions('projects.update')
  adminDelete(@Param('id') id: string, @Body() body: ReasonDto, @Req() req: AuthenticatedRequest) {
    return this.contracts.adminDelete(id, req.user?.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('projects.update')
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.contracts.restore(id, userId);
  }
  @Patch(':id/complete')
  @RequirePermissions('projects.update')
  complete(@Param('id') id: string) { return this.contracts.complete(id); }

  @Patch(':id/suspend')
  @RequirePermissions('projects.update')
  suspend(@Param('id') id: string) { return this.contracts.suspend(id); }

  @Patch(':id/terminate')
  @RequirePermissions('projects.update')
  terminate(@Param('id') id: string) { return this.contracts.terminate(id); }

  @Patch(':id/reactivate')
  @RequirePermissions('projects.update')
  reactivate(@Param('id') id: string) { return this.contracts.reactivate(id); }
}
