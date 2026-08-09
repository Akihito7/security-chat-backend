import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUserId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId: currentUserId } },
      },
      select: {
        id: true,
        createdAt: true,
        participants: {
          where: { userId: { not: currentUserId } },
          select: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return conversations.map((conversation) => ({
      conversationId: conversation.id,
      createdAt: conversation.createdAt,
      participants: conversation.participants.map(({ user }) => ({
        userId: user.id,
        username: user.username,
      })),
    }));
  }

  async create(username: string, currentUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === currentUserId) {
      throw new BadRequestException(
        'You cannot create a conversation with yourself',
      );
    }

    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUser.id } } },
          {
            participants: {
              every: { userId: { in: [currentUserId, targetUser.id] } },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (existingConversation) {
      return { conversationId: existingConversation.id };
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: currentUserId, joinedAt: new Date() },
            { userId: targetUser.id, joinedAt: new Date() },
          ],
        },
      },
      select: { id: true },
    });

    return { conversationId: conversation.id };
  }
}
