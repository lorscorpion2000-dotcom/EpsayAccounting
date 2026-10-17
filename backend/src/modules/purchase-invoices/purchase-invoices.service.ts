import { Injectable } from '@nestjs/common';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { UpdatePIItemDto } from './dto/create-purchase-invoice.dto';
import { PurchaseInvoicesCrudService } from './services/purchase-invoices-crud.service';
import { PurchaseInvoicesApproveService } from './services/purchase-invoices-approve.service';
import { PurchaseInvoicesSoftDeleteService } from './services/purchase-invoices-soft-delete.service';

/**
 * Facade برای سازگاری با controller.
 * منطق در سه سرویس:
 *  - PurchaseInvoicesCrudService       (CRUD + محاسبات)
 *  - PurchaseInvoicesApproveService    (approve + JE + FixedAsset + GRNI + resolver حساب)
 *  - PurchaseInvoicesSoftDeleteService (soft delete / restore / adminDelete)
 * (F8c5 — 719 خط → 4 فایل، بدون تغییر رفتار)
 */
@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private crud: PurchaseInvoicesCrudService,
    private approveSvc: PurchaseInvoicesApproveService,
    private softDeleteSvc: PurchaseInvoicesSoftDeleteService,
  ) {}

  // ─── CRUD ───
  findAll(q?: Parameters<PurchaseInvoicesCrudService['findAll']>[0]) { return this.crud.findAll(q); }
  findOne(id: string) { return this.crud.findOne(id); }
  create(dto: CreatePurchaseInvoiceDto, userId?: string) { return this.crud.create(dto, userId); }
  createFromPO(poId: string, dto: { invoiceNumber: string; invoiceDate: string; dueDate?: string }, userId?: string) {
    return this.crud.createFromPO(poId, dto, userId);
  }
  createFromGR(grId: string, dto: { invoiceNumber: string; invoiceDate: string; dueDate?: string }, userId?: string) {
    return this.crud.createFromGR(grId, dto, userId);
  }
  update(id: string, dto: UpdatePurchaseInvoiceDto) { return this.crud.update(id, dto); }
  remove(id: string) { return this.crud.remove(id); }
  updateItem(itemId: string, dto: UpdatePIItemDto) { return this.crud.updateItem(itemId, dto); }
  deleteItem(itemId: string) { return this.crud.deleteItem(itemId); }

  // ─── Approve ───
  approve(id: string, userId?: string) { return this.approveSvc.approve(id, userId); }

  // ─── Soft Delete ───
  softDelete(id: string, userId?: string, reason?: string, meta?: any) {
    return this.softDeleteSvc.softDelete(id, userId, reason, meta);
  }
  restore(id: string, userId?: string) { return this.softDeleteSvc.restore(id, userId); }
  adminDelete(id: string, userId?: string, reason?: string, meta?: any) {
    return this.softDeleteSvc.adminDelete(id, userId, reason, meta);
  }
}
