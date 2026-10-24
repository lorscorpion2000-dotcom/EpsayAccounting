import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';;;;
import { ContractsService } from './contracts.service';
import {
  CreateLegalContractDto,
  UpdateLegalContractDto,
  CancelLegalContractDto,
} from './dto/create-contract.dto';
import { CreateLegalPartyDto } from './dto/create-party.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReasonDto } from '../../common/dto';
import { LegalContractKind, LegalContractStatus } from '@prisma/client';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import type { AuthenticatedRequest } from '../auth/auth.controller';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private svc: ContractsService,
    private softDelete: SoftDeleteService,) {}

  // ── Contracts ──
  @Get()
  @RequirePermissions('contracts.read')
  list(
    @Query('kind', new ParseEnumPipe(LegalContractKind, { optional: true })) kind?: LegalContractKind,
    @Query('status', new ParseEnumPipe(LegalContractStatus, { optional: true })) status?: LegalContractStatus,
    @Query('search') search?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.svc.list({ kind, status, search, projectId });
  }

  @Get(':id')
  @RequirePermissions('contracts.read')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  @RequirePermissions('contracts.create')
  create(@Body() dto: CreateLegalContractDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('contracts.update')
  update(@Param('id') id: string, @Body() dto: UpdateLegalContractDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('contracts.cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelLegalContractDto, @Req() req: AuthenticatedRequest) {
    return this.svc.cancel(id, dto.reason, req.user?.id);
  }

  @Post(':id/activate')
  @RequirePermissions('contracts.activate')
  activate(@Param('id') id: string) {
    return this.svc.activate(id);
  }

  @Post(':id/reactivate')
  @RequirePermissions('contracts.activate')
  reactivate(@Param('id') id: string) {
    return this.svc.reactivate(id);
  }

  @Post(':id/complete')
  @RequirePermissions('contracts.activate')
  complete(@Param('id') id: string) {
    return this.svc.complete(id);
  }

  // ── Parties ──
  @Get('by-party/:partyId')
  @RequirePermissions('contracts.read')
  listByParty(
    @Param('partyId') partyId: string,
    @Query('kind', new ParseEnumPipe(LegalContractKind, { optional: true })) kind?: LegalContractKind,
  ) {
    return this.svc.listByParty(partyId, kind);
  }

  @Get('parties/list')
  @RequirePermissions('contracts.read')
  listParties(@Query('search') search?: string) {
    return this.svc.listParties(search);
  }

  @Get('parties/:id')
  @RequirePermissions('contracts.read')
  getParty(@Param('id') id: string) {
    return this.svc.getParty(id);
  }

  @Post('parties')
  @RequirePermissions('contracts.create')
  createParty(@Body() dto: CreateLegalPartyDto) {
    return this.svc.createParty(dto);
  }

  @Patch('parties/:id')
  @RequirePermissions('contracts.update')
  updateParty(@Param('id') id: string, @Body() dto: CreateLegalPartyDto) {
    return this.svc.updateParty(id, dto);
  }


  // ═══════════════════════════════════════════════════════════════
  // Contract Templates
  // ═══════════════════════════════════════════════════════════════

  @Get('templates/list')
  @RequirePermissions('contracts.read')
  listTemplates() {
    return this.svc.listTemplates();
  }

  @Get('templates/:kind')
  @RequirePermissions('contracts.read')
  getTemplate(@Param('kind') kind: string) {
    return this.svc.getTemplate(kind);
  }

  @Patch('templates/:kind')
  @RequirePermissions('contracts.update')
  upsertTemplate(
    @Param('kind') kind: string,
    @Body() body: { title: string; bodyHtml: string },
  ) {
    return this.svc.upsertTemplate(kind, body.title, body.bodyHtml);
  }


  @Post('parties/from-employee/:employeeId')
  @RequirePermissions('contracts.create')
  findOrCreatePartyFromEmployee(@Param('employeeId') employeeId: string) {
    return this.svc.findOrCreatePartyFromEmployee(employeeId);
  }

  @Post('parties/from-partner/:partnerId')
  @RequirePermissions('contracts.create')
  findOrCreatePartyFromPartner(@Param('partnerId') partnerId: string) {
    return this.svc.findOrCreatePartyFromPartner(partnerId);
  }

  @Delete(':id')
  @RequirePermissions('contracts.delete')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.remove(id, req.user?.id);
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('contracts.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user!;
    return this.softDelete.adminDelete({
      model: 'legalContract',
      id,
      user,
      reason: body?.reason || '',
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('contracts.update')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user!;
    return this.softDelete.restore({
      model: 'legalContract',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('contracts.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'legalContract',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
