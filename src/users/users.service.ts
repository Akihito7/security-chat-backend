import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async searchByUsername(username: string, currentUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        username: {
          contains: username,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        username: true,
      },
      orderBy: { username: 'asc' },
      take: 20,
    });

    return users.map((user) => ({
      userId: user.id,
      username: user.username,
    }));
  }
}
