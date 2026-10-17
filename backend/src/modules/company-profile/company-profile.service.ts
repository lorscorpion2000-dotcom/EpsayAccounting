import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

const SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class CompanyProfileService {
  constructor(private prisma: PrismaService) {}

  async get() {
    let cp = await this.prisma.companyProfile.findUnique({ where: { id: SINGLETON_ID } });
    if (!cp) {
      cp = await this.prisma.companyProfile.create({ data: { id: SINGLETON_ID } });
    }
    return cp;
  }

  async update(data: { name?: string; stampUrl?: string | null; logoUrl?: string | null }) {
    await this.get();
    return this.prisma.companyProfile.update({
      where: { id: SINGLETON_ID },
      data: {
        name: data.name,
        stampUrl: data.stampUrl,
        logoUrl: data.logoUrl,
      },
    });
  }
}
