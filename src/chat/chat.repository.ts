import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findChat(conversationId: string, currentUserId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { userId: currentUserId } },
      },
      select: {
        id: true,
        createdAt: true,
        participants: {
          select: {
            userId: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });
  }

  createMessage(conversationId: string, senderId: string, content: string) {
    return this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
      select: {
        id: true,
        conversationId: true,
        content: true,
        senderId: true,
        sentAt: true,
        sender: {
          select: {
            username: true,
          },
        },
      },
    });
  }

  markAsRead(conversationId: string, userId: string, readAt: Date) {
    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: readAt,
      },
      select: {
        conversationId: true,
      },
    });
  }
}
