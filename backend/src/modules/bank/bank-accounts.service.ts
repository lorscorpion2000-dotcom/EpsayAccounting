import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountDetailType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DetailAccountsService } from '../accounting/detail-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(
    private prisma: PrismaService,
    private detailAccounts: DetailAccountsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.bankAccount.count();
    return 'BA-' + year + '-' + String(count + 1).padStart(3, '0');
  }

  async findAll(query?: { active?: boolean }) {
    const where: any = {};
    if (query?.active !== undefined) where.isActive = query.active;
    return this.prisma.bankAccount.findMany({
      where,
      include: {
        glAccount: { select: { id: true, code: true, name: true } },
        _count: { select: { cheques: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const b = await this.prisma.bankAccount.findUnique({
      where: { id },
      include: {
        glAccount: { select: { id: true, code: true, name: true } },
        _count: { select: { cheques: true } },
      },
    });
    if (!b) throw new NotFoundException('حساب بانکی یافت نشد');
    return b;
  }

  async create(dto: CreateBankAccountDto) {
    const code = await this.generateCode();
    const type = (dto as any).type || 'BANK';
    const detailType = type === 'CASH_REGISTER'
      ? AccountDetailType.CASH_REGISTER
      : AccountDetailType.BANK;

    return this.prisma.$transaction(async (tx: any) => {
      const account = await tx.bankAccount.create({
        data: {
          code,
          type: type as any,
          name: dto.name,
          bankName: dto.bankName,
          branchName: dto.branchName,
          accountNumber: dto.accountNumber,
          shabaNumber: dto.shabaNumber,
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
      });

      try {
        const detail = await this.detailAccounts.ensureDetailAccount(tx, {
          detailType,
          entityId: account.id,
          entityName: dto.name,
          parentAccountCode: '1.1.1',
        });
        if (detail) {
          await tx.bankAccount.update({
            where: { id: account.id },
            data: { glAccountId: detail.id },
          });
          account.glAccountId = detail.id;
        }
      } catch (err) {
        console.error('[BankAccount] detail account failed:', err);
      }

      return this.prisma.bankAccount.findUnique({
        where: { id: account.id },
        include: { glAccount: { select: { id: true, code: true, name: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateBankAccountDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.bankName !== undefined) data.bankName = dto.bankName;
    if (dto.branchName !== undefined) data.branchName = dto.branchName;
    if (dto.accountNumber !== undefined) data.accountNumber = dto.accountNumber;
    if (dto.shabaNumber !== undefined) data.shabaNumber = dto.shabaNumber;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.$transaction(async (tx: any) => {
      const account = await tx.bankAccount.update({
        where: { id },
        data,
        include: { glAccount: { select: { id: true, code: true, name: true } } },
      });

      if (dto.name) {
        const detail = await tx.account.findFirst({
          where: { detailType: AccountDetailType.BANK, detailId: id },
        });
        if (detail && detail.name !== dto.name) {
          await tx.account.update({ where: { id: detail.id }, data: { name: dto.name } });
        }
      }
      if (dto.isActive !== undefined) {
        const detail = await tx.account.findFirst({
          where: { detailType: AccountDetailType.BANK, detailId: id },
        });
        if (detail && detail.isActive !== dto.isActive) {
          await tx.account.update({ where: { id: detail.id }, data: { isActive: dto.isActive } });
        }
      }
      return account;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const chequeCount = await this.prisma.cheque.count({ where: { bankAccountId: id } });
    if (chequeCount > 0) {
      throw new BadRequestException('این حساب بانکی دارای چک است و قابل حذف نیست');
    }
    return this.prisma.$transaction(async (tx: any) => {
      const detail = await tx.account.findFirst({
        where: { detailType: AccountDetailType.BANK, detailId: id },
      });
      if (detail) {
        await tx.account.update({ where: { id: detail.id }, data: { isActive: false } });
      }
      await tx.bankAccount.delete({ where: { id } });
      return { success: true };
    });
  }
}