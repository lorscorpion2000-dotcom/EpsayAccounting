import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AccountingEngineService } from '../../accounting/engine/accounting-engine.service';
import { CreateMaintenanceDto } from '../dto/equipment.dto';

@Injectable()
export class EquipmentMaintenanceService {
  constructor(
    private prisma: PrismaService,
    private engine: AccountingEngineService,
  ) {}

  private async nextMaintenanceCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'EQM-' + year + '-';
    const last = await this.prisma.equipmentMaintenance.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async listMaintenances(query?: {
    equipmentId?: string;
    projectId?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: Prisma.EquipmentMaintenanceWhereInput = {};
    if (query?.equipmentId) where.equipmentId = query.equipmentId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type as Prisma.EquipmentMaintenanceWhereInput['type'];
    if (query?.fromDate || query?.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query?.fromDate) dateFilter.gte = new Date(query.fromDate);
      if (query?.toDate) dateFilter.lte = new Date(query.toDate);
      where.maintenanceDate = dateFilter;
    }
    return this.prisma.equipmentMaintenance.findMany({
      where,
      include: {
        equipment: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { maintenanceDate: 'desc' },
      take: 500,
    });
  }

  async getMaintenance(id: string) {
    const m = await this.prisma.equipmentMaintenance.findUnique({
      where: { id },
      include: { equipment: true, project: true },
    });
    if (!m) throw new NotFoundException('رکورد تعمیر یافت نشد');
    return m;
  }

  async createMaintenance(dto: CreateMaintenanceDto, userId?: string) {
    const eq = await this.prisma.equipment.findUnique({ where: { id: dto.equipmentId } });
    if (!eq) throw new NotFoundException('ماشین یافت نشد');

    const code = await this.nextMaintenanceCode();
    const cost = Number(dto.cost) || 0;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.equipmentMaintenance.create({
        data: {
          code,
          equipmentId: dto.equipmentId,
          type: dto.type as unknown as Prisma.EquipmentMaintenanceUncheckedCreateInput['type'],
          maintenanceDate: new Date(dto.maintenanceDate),
          description: dto.description,
          cost,
          parts: dto.parts as Prisma.InputJsonValue | undefined,
          vendor: dto.vendor,
          invoiceNumber: dto.invoiceNumber,
          projectId: dto.projectId,
          nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : null,
          nextServiceHours: dto.nextServiceHours,
          notes: dto.notes,
          createdById: userId,
        },
        include: { equipment: true },
      });

      let journalCode: string | null = null;
      if (cost > 0.01) {
        const je = await this.engine.postEvent('EQUIPMENT_MAINTENANCE', {
          amount: cost,
          entryDate: created.maintenanceDate,
          description: 'تعمیرات ماشین ' + eq.code + ' — ' + eq.name,
          reference: created.code,
          projectId: dto.projectId || undefined,
          sourceId: created.id,
          userId,
          autoPost: true,
        }, tx);
        journalCode = je.code;
      }

      return { ...created, journalCode };
    });
  }

  async removeMaintenance(id: string) {
    await this.getMaintenance(id);
    await this.prisma.equipmentMaintenance.delete({ where: { id } });
    return { success: true };
  }
}
