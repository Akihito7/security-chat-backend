import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findChat(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
  }
}
