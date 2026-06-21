import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type * as express from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/auth.interface';
import { getJwtSecret } from '../../auth/jwt-secret';

interface RequestWithUser extends express.Request {
  user?: AuthenticatedUser;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.cookies
      ? (request.cookies['jwt'] as string | undefined)
      : undefined;

    if (!token) {
      return true;
    }

    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: getJwtSecret(),
      })) as unknown as JwtPayload;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });

      if (user) {
        request.user = user;
      }
    } catch {
      // Ignore token verification errors since auth is optional
    }

    return true;
  }
}
