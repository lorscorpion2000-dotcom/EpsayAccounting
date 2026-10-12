import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class LegalTemplateService {
  constructor(private prisma: PrismaService) {}

  async listTemplates() {
    return this.prisma.legalContractTemplate.findMany({
      orderBy: { kind: 'asc' },
    });
  }

  async getTemplate(kind: string) {
    return this.prisma.legalContractTemplate.findUnique({
      where: { kind: kind as any },
    });
  }

  async upsertTemplate(kind: string, title: string, bodyHtml: string) {
    return this.prisma.legalContractTemplate.upsert({
      where: { kind: kind as any },
      update: { title, bodyHtml },
      create: { kind: kind as any, title, bodyHtml },
    });
  }
}
