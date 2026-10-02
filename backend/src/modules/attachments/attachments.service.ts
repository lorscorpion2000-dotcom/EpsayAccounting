import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async list(entityType: string, entityId: string) {
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType و entityId الزامی هستند');
    }
    return this.prisma.attachment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async createMany(data: {
    entityType: string;
    entityId: string;
    files: { filename: string; url: string; size?: number; mimetype?: string }[];
    uploadedById?: string;
  }) {
    if (!data.entityType || !data.entityId) {
      throw new BadRequestException('entityType و entityId الزامی هستند');
    }
    if (!data.files || !data.files.length) {
      throw new BadRequestException('حداقل یک فایل الزامی است');
    }
    return this.prisma.attachment.createMany({
      data: data.files.map((f) => ({
        entityType: data.entityType,
        entityId: data.entityId,
        filename: f.filename,
        url: f.url,
        size: f.size,
        mimetype: f.mimetype,
        uploadedById: data.uploadedById,
      })),
    });
  }

  async remove(id: string) {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('پیوست پیدا نشد');
    await this.prisma.attachment.delete({ where: { id } });
    return { success: true };
  }
}
