import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(currentUserId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId: currentUserId } },
        messages: { some: {} },
      },
      select: {
        id: true,
        createdAt: true,
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        messages: {
          select: {
            content: true,
            senderId: true,
            sentAt: true,
            sender: {
              select: {
                username: true,
              },
            },
          },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(conversationId: string, currentUserId: string) {
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
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sentAt: true,
            sender: {
              select: {
                username: true,
              },
            },
          },
          orderBy: { sentAt: 'asc' },
        },
      },
    });
  }

  findUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
  }

  findDirectConversation(currentUserId: string, targetUserId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUserId } } },
          {
            participants: {
              every: { userId: { in: [currentUserId, targetUserId] } },
            },
          },
        ],
      },
      select: { id: true },
    });
  }

  create(currentUserId: string, targetUserId: string) {
    const joinedAt = new Date();

    return this.prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: currentUserId, joinedAt, lastReadAt: joinedAt },
            { userId: targetUserId, joinedAt, lastReadAt: joinedAt },
          ],
        },
      },
      select: { id: true },
    });
  }
}
