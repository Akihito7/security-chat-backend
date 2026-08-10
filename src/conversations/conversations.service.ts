import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
  ) {}

  async findAll(currentUserId: string) {
    const conversations =
      await this.conversationsRepository.findAll(currentUserId);

    const conversationSummaries = conversations.map((conversation) => {
      const [lastMessage] = conversation.messages;
      const currentParticipant = conversation.participants.find(
        ({ userId }) => userId === currentUserId,
      );

      return {
        conversationId: conversation.id,
        createdAt: conversation.createdAt,
        participants: conversation.participants
          .filter(({ userId }) => userId !== currentUserId)
          .map(({ user }) => ({
            userId: user.id,
            username: user.username,
          })),
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              senderUsername: lastMessage.sender.username,
              sentAt: lastMessage.sentAt,
              sentByCurrentUser: lastMessage.senderId === currentUserId,
            }
          : null,
        hasUnreadMessages: Boolean(
          lastMessage &&
            lastMessage.senderId !== currentUserId &&
            (!currentParticipant?.lastReadAt ||
              lastMessage.sentAt > currentParticipant.lastReadAt),
        ),
      };
    });

    return conversationSummaries.sort((first, second) => {
      const firstActivity = first.lastMessage?.sentAt ?? first.createdAt;
      const secondActivity = second.lastMessage?.sentAt ?? second.createdAt;

      return secondActivity.getTime() - firstActivity.getTime();
    });
  }

  async findById(conversationId: string, currentUserId: string) {
    const conversation = await this.conversationsRepository.findById(
      conversationId,
      currentUserId,
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      conversationId: conversation.id,
      createdAt: conversation.createdAt,
      participants: conversation.participants.map(({ user }) => ({
        userId: user.id,
        username: user.username,
      })),
      messages: conversation.messages.map((message) => ({
        messageId: message.id,
        content: message.content,
        senderId: message.senderId,
        senderUsername: message.sender.username,
        sentAt: message.sentAt,
      })),
    };
  }

  async create(username: string, currentUserId: string) {
    const targetUser =
      await this.conversationsRepository.findUserByUsername(username);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === currentUserId) {
      throw new BadRequestException(
        'You cannot create a conversation with yourself',
      );
    }

    const existingConversation =
      await this.conversationsRepository.findDirectConversation(
        currentUserId,
        targetUser.id,
      );

    if (existingConversation) {
      return { conversationId: existingConversation.id };
    }

    const conversation = await this.conversationsRepository.create(
      currentUserId,
      targetUser.id,
    );

    return { conversationId: conversation.id };
  }
}
