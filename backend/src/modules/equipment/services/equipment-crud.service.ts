import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CreateEquipmentDto, UpdateEquipmentDto,
} from '../dto/equipment.dto';

@Injectable()
export class EquipmentCrudService {
  constructor(private prisma: PrismaService) {}

  // ─── Code generator ───
  private async nextEquipmentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'EQ-' + year + '-';
    const last = await this.prisma.equipment.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async listEquipments(query?: {
    search?: string;
    ownership?: string;
    status?: string;
    projectId?: string;
    isActive?: boolean;
  }) {
    const where: any = {};
    if (query?.ownership) where.ownership = query.ownership;
    if (query?.status) where.status = query.status;
    if (query?.projectId) where.currentProjectId = query.projectId;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { plateNumber: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.equipment.findMany({
      where,
      include: {
        owner: { select: { id: true, code: true, name: true } },
        currentProject: { select: { id: true, code: true, name: true } },
        _count: { select: { dailyLogs: true, maintenances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEquipment(id: string) {
    const eq = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        owner: true,
        currentProject: { select: { id: true, code: true, name: true } },
        maintenances: { orderBy: { maintenanceDate: 'desc' }, take: 20 },
      },
    });
    if (!eq) throw new NotFoundException('ماشین یافت نشد');
    return eq;
  }

  async createEquipment(dto: CreateEquipmentDto) {
    const code = await this.nextEquipmentCode();
    return this.prisma.equipment.create({
      data: {
        code,
        name: dto.name,
        ownership: (dto.ownership as any) || 'OWNED',
        category: dto.category,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        plateNumber: dto.plateNumber,
        serialNumber: dto.serialNumber,
        hourlyRate: dto.hourlyRate,
        dailyRate: dto.dailyRate,
        monthlyRate: dto.monthlyRate,
        fuelType: dto.fuelType,
        fuelNormPerHour: dto.fuelNormPerHour,
        ownerId: dto.ownerId,
        currentProjectId: dto.currentProjectId,
        status: (dto.status as any) || 'ACTIVE',
        isActive: dto.isActive ?? true,
        description: dto.description,
      },
    });
  }

  async updateEquipment(id: string, dto: UpdateEquipmentDto) {
    await this.getEquipment(id);
    const data: any = { ...dto };
    delete data.code;
    return this.prisma.equipment.update({ where: { id }, data });
  }

  async removeEquipment(id: string, options?: { force?: boolean }) {
    await this.getEquipment(id);
    const force = options?.force === true;

    const refs = await this.countEquipmentReferences(id);
    const total = Object.values(refs).reduce((s: number, n: any) => s + Number(n || 0), 0);

    if (!force) {
      if (total > 0) {
        await this.prisma.equipment.update({
          where: { id },
          data: { isActive: false, status: 'RETIRED' as any },
        });
        return { success: true, softDeleted: true };
      }
      await this.prisma.equipment.delete({ where: { id } });
      return { success: true, hardDeleted: true };
    }

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'EQUIPMENT_HAS_REFS',
        message: 'ماشین در ' + total + ' مورد دیگر استفاده شده:\n' + details + '\n\nاگر می‌خواهید همه پاک شود، از دکمه تأیید دوم استفاده کنید.',
        refs, total,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.equipmentDailyLog.deleteMany({ where: { equipmentId: id } });
      await tx.equipmentMaintenance.deleteMany({ where: { equipmentId: id } });
      await (tx as any).dailyReportEquipment?.deleteMany({ where: { equipmentId: id } }).catch(() => {});
      await tx.equipment.delete({ where: { id } });
    });
    return { success: true, hardDeleted: true };
  }

  private async countEquipmentReferences(id: string) {
    const p = this.prisma;
    const [dailyLogs, maintenances, reportLinks] = await Promise.all([
      p.equipmentDailyLog.count({ where: { equipmentId: id } }),
      p.equipmentMaintenance.count({ where: { equipmentId: id } }),
      (p as any).dailyReportEquipment?.count({ where: { equipmentId: id } }).catch(() => 0) || Promise.resolve(0),
    ]);
    return { dailyLogs, maintenances, reportLinks };
  }

  async stats() {
    const [total, active, idle, maintenance, broken, retired] = await Promise.all([
      this.prisma.equipment.count({ where: { isActive: true } }),
      this.prisma.equipment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.equipment.count({ where: { status: 'IDLE' } }),
      this.prisma.equipment.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.equipment.count({ where: { status: 'BROKEN' } }),
      this.prisma.equipment.count({ where: { status: 'RETIRED' } }),
    ]);
    return { total, active, idle, maintenance, broken, retired };
  }
}
