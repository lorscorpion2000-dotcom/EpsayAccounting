import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePartnerDto, PartnerTypeDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const count = await this.prisma.partner.count();
    return 'PTN-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { type?: string; search?: string }) {
    const where: any = { isActive: true };
    if (query?.type) where.type = query.type;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.partner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.partner.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('شخص یافت نشد');
    return p;
  }

  async create(dto: CreatePartnerDto) {
    const code = await this.generateCode();
    return this.prisma.partner.create({
      data: {
        code,
        name: dto.name,
        type: (dto.type as any) || 'OTHER',
        nationalId: dto.nationalId,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
      },
    });
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.findOne(id);
    return this.prisma.partner.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        nationalId: dto.nationalId,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.partner.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}
