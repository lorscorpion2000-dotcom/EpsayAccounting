import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ImportCSItemsDto } from '../dto/client-statement.dto';
import { ClientStatementCrudService } from './client-statement-crud.service';

@Injectable()
export class ClientStatementItemsService {
  constructor(
    private prisma: PrismaService,
    private crud: ClientStatementCrudService,
  ) {}

  async importItems(id: string, dto: ImportCSItemsDto) {
    const s = await this.crud.get(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');
    const startRow = s.items.length;
    const items = dto.items.map((it, idx) => ({
      statementId: id,
      category: dto.category as any,
      rowNumber: startRow + idx + 1,
      priceListCode: it.priceListCode,
      description: it.description,
      unit: it.unit,
      unitPrice: it.unitPrice,
      quantity: it.quantity ?? 1,
      totalPrice: Number(it.unitPrice) * Number(it.quantity ?? 1),
      itemDate: it.itemDate ? new Date(it.itemDate) : null,
      wbsItemId: it.wbsItemId,
      notes: it.notes,
    }));
    const result = await this.prisma.clientStatementItem.createMany({ data: items });
    await this.crud.recompute(id);
    return { inserted: result.count };
  }

  async deleteItem(itemId: string) {
    const it = await this.prisma.clientStatementItem.findUnique({ where: { id: itemId } });
    if (!it) throw new NotFoundException('ردیف یافت نشد');
    const s = await this.prisma.clientStatement.findUnique({ where: { id: it.statementId } });
    if (!s || s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');
    await this.prisma.clientStatementItem.delete({ where: { id: itemId } });
    await this.crud.recompute(it.statementId);
    return { success: true };
  }
}
