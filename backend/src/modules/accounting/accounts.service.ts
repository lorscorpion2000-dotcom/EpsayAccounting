import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Account } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAccountDto, AccountLevelDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

/**
 * Tree node shape used by findTree(). Account is the base Prisma model type;
 * children is added recursively for the tree response.
 */
type AccountNode = Account & { children: AccountNode[] };

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findTree(): Promise<AccountNode[]> {
    const accounts = await this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });
    const map = new Map<string, AccountNode>();
    accounts.forEach((a) => map.set(a.id, { ...a, children: [] }));
    const roots: AccountNode[] = [];
    map.forEach((acc) => {
      if (acc.parentId) {
        const parent = map.get(acc.parentId);
        if (parent) parent.children.push(acc);
      } else {
        roots.push(acc);
      }
    });
    return roots;
  }

  async findAllFlat() {
    return this.prisma.account.findMany({
      orderBy: { code: 'asc' },
      where: { isActive: true },
    });
  }

  async findPostable() {
    const accounts = await this.prisma.account.findMany({
      where: { isActive: true, isPostable: true },
      include: {
        children: {
          where: { isActive: true, isPostable: true, deletedAt: null },
          select: { id: true, level: true, code: true, name: true, nature: true, parentId: true, isActive: true, isPostable: true, description: true, detailType: true, detailId: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const result = accounts.filter((a) => {
      if (a.level === 'DETAIL' || (a.level as string) === 'TAFZIL') return true;
      if (a.level === 'SUBSIDIARY') {
        const hasPostableChildren = a.children.length > 0;
        return !hasPostableChildren;
      }
      return false;
    });

    return result;
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { where: { deletedAt: null } },
      },
    });
    if (!account) throw new NotFoundException('حساب یافت نشد');
    return account;
  }

  async generateCode(parentId?: string): Promise<string> {
    if (!parentId) {
      const count = await this.prisma.account.count({ where: { parentId: null } });
      return String(count + 1);
    }
    const parent = await this.prisma.account.findUnique({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('والد یافت نشد');
    const siblingsCount = await this.prisma.account.count({ where: { parentId } });
    return parent.code + '.' + String(siblingsCount + 1);
  }

  async create(dto: CreateAccountDto) {
    const exists = await this.prisma.account.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('کد حساب تکراری است');

    if (dto.parentId) {
      const parent = await this.prisma.account.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('والد یافت نشد');
      const expectedLevel = this.nextLevel(parent.level);
      if (dto.level !== expectedLevel) {
        throw new BadRequestException(
          `سطح باید «${expectedLevel}» باشد (یک سطح پایین‌تر از والد)`,
        );
      }
    }

    const data: Prisma.AccountUncheckedCreateInput = {
      code: dto.code,
      name: dto.name,
      level: dto.level as unknown as Prisma.AccountUncheckedCreateInput['level'],
      nature: dto.nature as unknown as Prisma.AccountUncheckedCreateInput['nature'],
      parentId: dto.parentId,
      isActive: dto.isActive ?? true,
      isPostable: dto.isPostable ?? true,
      description: dto.description,
      detailType: (dto.detailType as unknown as Prisma.AccountUncheckedCreateInput['detailType']) || null,
      detailId: dto.detailId || null,
    };
    return this.prisma.account.create({ data });
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    const data: Prisma.AccountUncheckedUpdateInput = {};
    if (dto.detailType !== undefined) data.detailType = (dto.detailType as unknown as Prisma.AccountUncheckedUpdateInput['detailType']) || null;
    if (dto.detailId !== undefined) data.detailId = dto.detailId || null;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.level !== undefined) data.level = dto.level as unknown as Prisma.AccountUncheckedUpdateInput['level'];
    if (dto.nature !== undefined) data.nature = dto.nature as unknown as Prisma.AccountUncheckedUpdateInput['nature'];
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isPostable !== undefined) data.isPostable = dto.isPostable;
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.account.update({ where: { id }, data });
  }

  async remove(id: string, userId?: string) {
    const account = await this.findOne(id);
    if (account.children && account.children.length > 0) {
      throw new BadRequestException('ابتدا زیرمجموعه‌ها را حذف کنید');
    }
    const linesCount = await this.prisma.journalLine.count({ where: { accountId: id } });
    if (linesCount > 0) {
      throw new BadRequestException(
        'این حساب در اسناد استفاده شده است — ابتدا سند مربوطه را ابطال کنید یا از «حذف توسط مدیر» استفاده کنید',
      );
    }
    await this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  private nextLevel(current: string): AccountLevelDto {
    const order: AccountLevelDto[] = [
      AccountLevelDto.GROUP,
      AccountLevelDto.GENERAL,
      AccountLevelDto.SUBSIDIARY,
      AccountLevelDto.DETAIL,
    ];
    const idx = order.indexOf(current as AccountLevelDto);
    return order[Math.min(idx + 1, order.length - 1)];
  }

  async findAllForFilter() {
    const accounts = await this.prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: {
        id: true, code: true, name: true, level: true, nature: true,
        parentId: true, isPostable: true, subtype: true,
      },
    });
    return accounts;
  }
}
