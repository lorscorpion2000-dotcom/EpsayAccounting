import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.technicalDocument.count();
    return 'DOC-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; phase?: string; search?: string }) {
    const where: Prisma.TechnicalDocumentWhereInput = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type as Prisma.TechnicalDocumentWhereInput['type'];
    if (query?.phase) where.phase = query.phase as Prisma.TechnicalDocumentWhereInput['phase'];
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.technicalDocument.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: [{ projectId: 'asc' }, { type: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const d = await this.prisma.technicalDocument.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!d) throw new NotFoundException('سند فنی یافت نشد');
    return d;
  }

  async create(dto: CreateDocumentDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.technicalDocument.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type as unknown as Prisma.TechnicalDocumentUncheckedCreateInput['type'],
        phase: dto.phase as unknown as Prisma.TechnicalDocumentUncheckedCreateInput['phase'],
        title: dto.title,
        version: dto.version,
        isApproved: dto.isApproved ?? false,
        approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : null,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
        uploadedById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);
    return this.prisma.technicalDocument.update({
      where: { id },
      data: {
        type: dto.type as unknown as Prisma.TechnicalDocumentUncheckedCreateInput['type'],
        phase: dto.phase as unknown as Prisma.TechnicalDocumentUncheckedCreateInput['phase'],
        title: dto.title,
        version: dto.version,
        isApproved: dto.isApproved,
        approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : undefined,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string, _options?: { force?: boolean }) {
    await this.findOne(id);
    // مستقیم پاک کن (این موجودیت‌ها معمولاً ارجاعی ندارند)
    await this.prisma.technicalDocument.delete({ where: { id } });
    return { success: true, hardDeleted: true };
  }
}
