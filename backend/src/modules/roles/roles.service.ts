import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Prisma } from '@prisma/client';

type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: { permissions: { include: { permission: true } } };
}>;

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  private readonly roleInclude = {
    permissions: {
      include: { permission: true },
    },
  };

  private shape(role: RoleWithPermissions) {
    return {
      id: role.id,
      code: role.code,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: this.roleInclude,
      orderBy: { createdAt: 'asc' },
    });
    return roles.map((r) => this.shape(r));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: this.roleInclude,
    });
    if (!role) throw new NotFoundException('نقش یافت نشد');
    return this.shape(role);
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('کد نقش تکراری است');

    const role = await this.prisma.role.create({
      data: {
        code: dto.code,
        displayName: dto.displayName,
        description: dto.description,
        isSystem: false,
        permissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map((permissionId) => ({ permissionId })),
            }
          : undefined,
      },
      include: this.roleInclude,
    });
    return this.shape(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (role.isSystem && dto.code && dto.code !== role.code) {
      throw new ConflictException('کد نقش‌های سیستمی قابل تغییر نیست');
    }

    if (dto.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissionIds.length) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        code: dto.code,
        displayName: dto.displayName,
        description: dto.description,
      },
      include: this.roleInclude,
    });
    return this.shape(updated);
  }

  async assignPermissions(id: string, permissionIds: string[]) {
    await this.findOne(id);
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissionIds.length) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        skipDuplicates: true,
      });
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ConflictException('نقش‌های سیستمی قابل حذف نیستند');
    }
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}