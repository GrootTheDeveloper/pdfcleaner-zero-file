import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const emailLower = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existing) {
      throw new BadRequestException('Email address is already in use');
    }

    const passwordHash = await argon2.hash(dto.password);

    const allowFirstUserAdmin =
      process.env.ALLOW_FIRST_USER_ADMIN === 'true' ||
      process.env.NODE_ENV !== 'production';
    const count = allowFirstUserAdmin ? await this.prisma.user.count() : 1;
    const role = count === 0 ? Role.ADMIN : Role.USER;

    const user = await this.prisma.user.create({
      data: {
        email: emailLower,
        passwordHash,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const emailLower = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
