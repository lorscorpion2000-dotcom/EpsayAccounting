import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import {
  CreateLegalContractDto,
  UpdateLegalContractDto,
  CancelLegalContractDto,
} from './dto/create-contract.dto';
import { CreateLegalPartyDto } from './dto/create-party.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private svc: ContractsService) {}

  // ── Contracts ──
  @Get()
  list(
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.svc.list({ kind, status, search, projectId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  create(@Body() dto: CreateLegalContractDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLegalContractDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelLegalContractDto, @Req() req: any) {
    return this.svc.cancel(id, dto.reason, req.user?.id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.svc.activate(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.svc.complete(id);
  }

  // ── Parties ──
  @Get('parties/list')
  listParties(@Query('search') search?: string) {
    return this.svc.listParties(search);
  }

  @Get('parties/:id')
  getParty(@Param('id') id: string) {
    return this.svc.getParty(id);
  }

  @Post('parties')
  createParty(@Body() dto: CreateLegalPartyDto) {
    return this.svc.createParty(dto);
  }

  @Patch('parties/:id')
  updateParty(@Param('id') id: string, @Body() dto: CreateLegalPartyDto) {
    return this.svc.updateParty(id, dto);
  }


  // ═══════════════════════════════════════════════════════════════
  // Contract Templates
  // ═══════════════════════════════════════════════════════════════

  @Get('templates/list')
  listTemplates() {
    return this.svc.listTemplates();
  }

  @Get('templates/:kind')
  getTemplate(@Param('kind') kind: string) {
    return this.svc.getTemplate(kind);
  }

  @Patch('templates/:kind')
  upsertTemplate(
    @Param('kind') kind: string,
    @Body() body: { title: string; bodyHtml: string },
  ) {
    return this.svc.upsertTemplate(kind, body.title, body.bodyHtml);
  }


  @Post('parties/from-employee/:employeeId')
  findOrCreatePartyFromEmployee(@Param('employeeId') employeeId: string) {
    return this.svc.findOrCreatePartyFromEmployee(employeeId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
