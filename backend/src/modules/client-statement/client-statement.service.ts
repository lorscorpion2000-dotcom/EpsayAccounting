import { Injectable } from '@nestjs/common';
import {
  CreateCSDto, UpdateCSDto, ImportCSItemsDto,
} from './dto/client-statement.dto';
import { ClientStatementCrudService } from './services/client-statement-crud.service';
import { ClientStatementItemsService } from './services/client-statement-items.service';
import { ClientStatementWorkflowService } from './services/client-statement-workflow.service';
import { ClientStatementPostService } from './services/client-statement-post.service';

/**
 * Facade برای سازگاری با controller.
 * منطق در چهار سرویس:
 *  - ClientStatementCrudService      (CRUD + محاسبات)
 *  - ClientStatementItemsService     (ردیف‌ها)
 *  - ClientStatementWorkflowService  (submit/approve/reject/cancel)
 *  - ClientStatementPostService      (post + JE)
 * (F8c4 — 404 خط → 5 فایل، بدون تغییر رفتار)
 */
@Injectable()
export class ClientStatementService {
  constructor(
    private crud: ClientStatementCrudService,
    private items: ClientStatementItemsService,
    private workflow: ClientStatementWorkflowService,
    private postSvc: ClientStatementPostService,
  ) {}

  // ─── CRUD ───
  list(q?: Parameters<ClientStatementCrudService['list']>[0]) { return this.crud.list(q); }
  get(id: string) { return this.crud.get(id); }
  create(dto: CreateCSDto) { return this.crud.create(dto); }
  update(id: string, dto: UpdateCSDto) { return this.crud.update(id, dto); }
  remove(id: string) { return this.crud.remove(id); }
  stats(projectId?: string) { return this.crud.stats(projectId); }
  nextStatementNumber(projectId: string) { return this.crud.nextStatementNumber(projectId); }

  // ─── Items ───
  importItems(id: string, dto: ImportCSItemsDto) { return this.items.importItems(id, dto); }
  deleteItem(itemId: string) { return this.items.deleteItem(itemId); }

  // ─── Workflow ───
  submit(id: string) { return this.workflow.submit(id); }
  approve(id: string, userId: string) { return this.workflow.approve(id, userId); }
  reject(id: string, reason: string) { return this.workflow.reject(id, reason); }
  cancel(id: string) { return this.workflow.cancel(id); }

  // ─── Post ───
  post(id: string, userId?: string) { return this.postSvc.post(id, userId); }
}
