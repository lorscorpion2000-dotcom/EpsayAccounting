import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { validatePassword } from '../../common/validators/password.validator';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    username: true,
    fullName: true,
    email: true,
    mobile: true,
    nationalCode: true,
    isActive: true,
    isStaff: true,
    defaultProjectId: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    roles: {
      select: {
        role: { select: { id: true, code: true, displayName: true } },
      },
    },
  };

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: this.userSelect,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({
      ...u,
      roles: u.roles.map((r) => r.role),
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return { ...user, roles: user.roles.map((r) => r.role) };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (exists) throw new ConflictException('نام کاربری تکراری است');

    const pwErrors = validatePassword(dto.password, dto.username);
    if (pwErrors.length) {
      throw new BadRequestException(
        'رمز عبور ضعیف است: ' + pwErrors.join('، '),
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        email: dto.email,
        mobile: dto.mobile,
        nationalCode: dto.nationalCode,
        isActive: dto.isActive ?? true,
        isStaff: dto.isStaff ?? false,
        defaultProjectId: dto.defaultProjectId ?? null,
        roles: dto.roleIds?.length
          ? {
              create: dto.roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      select: this.userSelect,
    });
    return { ...user, roles: user.roles.map((r) => r.role) };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const { password, roleIds, ...rest } = dto;

    const data: any = { ...rest };
    if (password) {
      const current = await this.prisma.user.findUnique({ where: { id }, select: { username: true } });
      const pwErrors = validatePassword(password, current?.username);
      if (pwErrors.length) {
        throw new BadRequestException(
          'رمز عبور ضعیف است: ' + pwErrors.join('، '),
        );
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    if (roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length) {
        await this.prisma.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
          skipDuplicates: true,
        });
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect,
    });
    return { ...user, roles: user.roles.map((r) => r.role) };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
  // ═══════════════════════════════════════════════════════
  // Project Assignments (P1 - RBAC پروژه‌محور)
  // ═══════════════════════════════════════════════════════

  async listProjects(userId: string) {
    await this.findOne(userId);
    return this.prisma.userProject.findMany({
      where: { userId },
      include: {
        project: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignProject(userId: string, projectId: string, byUserId?: string) {
    await this.findOne(userId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    return this.prisma.userProject.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId, createdBy: byUserId },
      update: {},
    });
  }

  async unassignProject(userId: string, projectId: string) {
    await this.prisma.userProject
      .delete({
        where: { userId_projectId: { userId, projectId } },
      })
      .catch(() => null);

    await this.prisma.user.updateMany({
      where: { id: userId, defaultProjectId: projectId },
      data: { defaultProjectId: null },
    });

    return { success: true };
  }

  async setDefaultProject(userId: string, projectId: string | null) {
    await this.findOne(userId);
    if (projectId) {
      const link = await this.prisma.userProject.findUnique({
        where: { userId_projectId: { userId, projectId } },
      });
      if (!link) {
        throw new BadRequestException('پروژه به این کاربر تخصیص نیافته است');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { defaultProjectId: projectId },
      select: { id: true, defaultProjectId: true },
    });
  }
}