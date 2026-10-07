import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') as string,
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const permissions = new Set<string>();
    user.roles.forEach((ur) =>
      ur.role.permissions.forEach((rp) => permissions.add(rp.permission.code)),
    );

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role.code),
      permissions: Array.from(permissions),
      mustChangePassword: user.mustChangePassword,
    };
  }
}