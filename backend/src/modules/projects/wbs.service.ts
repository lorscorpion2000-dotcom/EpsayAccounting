import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateWbsDto } from './dto/create-wbs.dto';
import { UpdateWbsDto } from './dto/update-wbs.dto';

@Injectable()
export class WbsService {
  constructor(private prisma: PrismaService) {}

  private async resolveUnitId(code?: string | null): Promise<string | null> {
    if (!code) return null;
    const u = await this.prisma.unit.findFirst({
      where: { OR: [{ code }, { name: code }, { symbol: code }] },
      select: { id: true },
    });
    return u?.id ?? null;
  }


  private async generateCode(projectId: string, parentId?: string): Promise<string> {
    if (!parentId) {
      const count = await this.prisma.wbsItem.count({
        where: { projectId, parentId: null },
      });
      return String(count + 1);
    }
    const parent = await this.prisma.wbsItem.findUnique({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('گره والد یافت نشد');
    const siblingsCount = await this.prisma.wbsItem.count({
      where: { projectId, parentId },
    });
    return parent.code + '.' + String(siblingsCount + 1);
  }

  async findTree(projectId: string) {
    const items = await this.prisma.wbsItem.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    const map = new Map<string, any>();
    items.forEach((it) => map.set(it.id, { ...it, children: [] }));

    const roots: any[] = [];
    map.forEach((item) => {
      if (item.parentId) {
        const parent = map.get(item.parentId);
        if (parent) parent.children.push(item);
      } else {
        roots.push(item);
      }
    });
    return roots;
  }

  async findOne(id: string) {
    const item = await this.prisma.wbsItem.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
    if (!item) throw new NotFoundException('گره WBS یافت نشد');
    return item;
  }

  async create(dto: CreateWbsDto) {
    const code = await this.generateCode(dto.projectId, dto.parentId);
    const totalPrice =
      dto.quantity != null && dto.unitPrice != null
        ? Number(dto.quantity) * Number(dto.unitPrice)
        : null;

    const unitId = await this.resolveUnitId(dto.unit as any);
    return this.prisma.wbsItem.create({
      data: {
        projectId: dto.projectId,
        parentId: dto.parentId,
        code,
        title: dto.title,
        level: dto.level,
        unit: dto.unit,
        unitId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        totalPrice,
        weight: dto.weight,
        sortOrder: dto.sortOrder ?? 0,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateWbsDto) {
    const existing = await this.findOne(id);
    let totalPrice: number | null =
      existing.totalPrice != null ? Number(existing.totalPrice) : null;
    if (dto.quantity != null || dto.unitPrice != null) {
      const q = dto.quantity ?? Number(existing.quantity ?? 0);
      const p = dto.unitPrice ?? Number(existing.unitPrice ?? 0);
      totalPrice = q * p;
    }
    const unitId = dto.unit !== undefined ? await this.resolveUnitId(dto.unit as any) : undefined;
    return this.prisma.wbsItem.update({
      where: { id },
      data: {
        title: dto.title,
        level: dto.level,
        unit: dto.unit,
        ...(unitId !== undefined && { unitId }),
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        totalPrice,
        weight: dto.weight,
        sortOrder: dto.sortOrder,
        description: dto.description,
      },
    });
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    if (item.children.length > 0) {
      throw new BadRequestException('ابتدا زیرمجموعه‌ها را حذف کنید');
    }
    await this.prisma.wbsItem.delete({ where: { id } });
    return { success: true };
  }
}
