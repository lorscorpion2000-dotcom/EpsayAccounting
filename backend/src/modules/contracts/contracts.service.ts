import { Injectable } from '@nestjs/common';
import {
  CreateLegalContractDto,
  UpdateLegalContractDto,
} from './dto/create-contract.dto';
import { CreateLegalPartyDto } from './dto/create-party.dto';
import { ContractService } from './services/contract.service';
import { LegalPartyService } from './services/legal-party.service';
import { LegalTemplateService } from './services/legal-template.service';

/**
 * Facade برای سازگاری با controller.
 * منطق در سه سرویس:
 *  - ContractService        (CRUD قرارداد + workflow)
 *  - LegalPartyService      (طرفین + یافتن/ساخت از پرسنل/Partner)
 *  - LegalTemplateService   (قالب‌های قرارداد)
 * (F8c3 — 503 خط → 4 فایل، بدون تغییر رفتار)
 */
@Injectable()
export class ContractsService {
  constructor(
    private contract: ContractService,
    private party: LegalPartyService,
    private template: LegalTemplateService,
  ) {}

  // ─── Contracts ───
  list(q?: Parameters<ContractService['list']>[0]) { return this.contract.list(q as any); }
  listByParty(id: string, kind?: string) { return this.contract.listByParty(id, kind); }
  get(id: string) { return this.contract.get(id); }
  create(dto: CreateLegalContractDto) { return this.contract.create(dto); }
  update(id: string, dto: UpdateLegalContractDto) { return this.contract.update(id, dto); }
  cancel(id: string, reason: string, userId?: string) { return this.contract.cancel(id, reason, userId); }
  activate(id: string) { return this.contract.activate(id); }
  reactivate(id: string) { return this.contract.reactivate(id); }
  complete(id: string) { return this.contract.complete(id); }
  remove(id: string, options?: { force?: boolean }) { return this.contract.remove(id, options); }

  // ─── Parties ───
  listParties(search?: string) { return this.party.listParties(search); }
  getParty(id: string) { return this.party.getParty(id); }
  createParty(dto: CreateLegalPartyDto) { return this.party.createParty(dto); }
  updateParty(id: string, dto: CreateLegalPartyDto) { return this.party.updateParty(id, dto); }
  findOrCreatePartyFromEmployee(employeeId: string) {
    return this.party.findOrCreatePartyFromEmployee(employeeId);
  }
  findOrCreatePartyFromPartner(partnerId: string) {
    return this.party.findOrCreatePartyFromPartner(partnerId);
  }

  // ─── Templates ───
  listTemplates() { return this.template.listTemplates(); }
  getTemplate(kind: string) { return this.template.getTemplate(kind); }
  upsertTemplate(kind: string, title: string, bodyHtml: string) {
    return this.template.upsertTemplate(kind, title, bodyHtml);
  }
}
