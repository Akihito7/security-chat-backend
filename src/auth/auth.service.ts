import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';

interface AuthUser {
  id: string;
  username: string;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register({ username, password }: AuthCredentialsDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Username is already in use');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          passwordHash: await hash(password, 12),
        },
        select: {
          id: true,
          username: true,
          createdAt: true,
        },
      });

      return this.createAuthResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Username is already in use');
      }

      throw error;
    }
  }

  async login({ username, password }: AuthCredentialsDto) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.createAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.id,
      username: user.username,
    };
  }

  private async createAuthResponse(user: AuthUser) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    };
  }
}
