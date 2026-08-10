import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { authCookieName } from '../auth/auth.constants';
import { ChatRepository } from './chat.repository';

interface SendMessageInput {
  conversationId: string;
  content: string;
  socket: Socket;
}

export interface SocketUser {
  sub: string;
  username: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly jwtService: JwtService,
  ) {}

  async findChat(conversationId: string, currentUserId: string) {
    const chat = await this.chatRepository.findChat(
      conversationId,
      currentUserId,
    );

    if (!chat) {
      throw new WsException(`Chat with id ${conversationId} not found.`);
    }

    return chat;
  }

  async sendMessage({ conversationId, content, socket }: SendMessageInput) {
    const currentUser = await this.authenticate(socket);
    const chat = await this.findChat(conversationId, currentUser.sub);
    const message = {
      conversationId: chat.id,
      content,
      senderId: currentUser.sub,
      senderUsername: currentUser.username,
      sentAt: new Date().toISOString(),
    };

    socket
      .to(`conversation:${conversationId}`)
      .emit('message:received', message);

    const savedMessage = await this.chatRepository.createMessage(
      chat.id,
      currentUser.sub,
      content,
    );

    for (const participant of chat.participants) {
      const isSender = participant.userId === currentUser.sub;
      const isViewingConversation = this.isUserViewingConversation(
        socket,
        participant.userId,
        conversationId,
      );
      const hasUnreadMessages = !isSender && !isViewingConversation;

      if (!hasUnreadMessages) {
        await this.chatRepository.markAsRead(
          conversationId,
          participant.userId,
          savedMessage.sentAt,
        );
      }

      const otherParticipants = chat.participants
        .filter(({ userId }) => userId !== participant.userId)
        .map(({ userId, user }) => ({
          userId,
          username: user.username,
        }));

      socket.nsp
        .to(`user:${participant.userId}`)
        .emit('conversation:updated', {
          conversationId: savedMessage.conversationId,
          preview: savedMessage.content,
          senderId: savedMessage.senderId,
          senderUsername: savedMessage.sender.username,
          sentAt: savedMessage.sentAt,
          hasUnreadMessages,
          createdAt: chat.createdAt,
          participants: otherParticipants,
        });
    }

    return {
      messageId: savedMessage.id,
      conversationId: savedMessage.conversationId,
      content: savedMessage.content,
      senderId: savedMessage.senderId,
      senderUsername: savedMessage.sender.username,
      sentAt: savedMessage.sentAt,
    };
  }

  async joinConversation(conversationId: string, socket: Socket) {
    const currentUser = await this.authenticate(socket);
    await this.findChat(conversationId, currentUser.sub);
    await socket.join(`conversation:${conversationId}`);
    await this.chatRepository.markAsRead(
      conversationId,
      currentUser.sub,
      new Date(),
    );

    socket.nsp.to(`user:${currentUser.sub}`).emit('conversation:read', {
      conversationId,
    });
  }

  async leaveConversation(conversationId: string, socket: Socket) {
    await socket.leave(`conversation:${conversationId}`);
  }

  async authenticate(socket: Socket) {
    const token = this.getCookie(socket.handshake.headers.cookie, authCookieName);

    if (!token) {
      throw new WsException('Authentication cookie is required');
    }

    try {
      return await this.jwtService.verifyAsync<SocketUser>(token);
    } catch {
      throw new WsException('Invalid or expired token');
    }
  }

  private getCookie(cookieHeader: string | undefined, cookieName: string) {
    if (!cookieHeader) return undefined;

    for (const cookie of cookieHeader.split(';')) {
      const [name, ...valueParts] = cookie.trim().split('=');

      if (name === cookieName) {
        return decodeURIComponent(valueParts.join('='));
      }
    }

    return undefined;
  }

  private isUserViewingConversation(
    socket: Socket,
    userId: string,
    conversationId: string,
  ) {
    const userSockets = socket.nsp.adapter.rooms.get(`user:${userId}`);
    const conversationSockets = socket.nsp.adapter.rooms.get(
      `conversation:${conversationId}`,
    );

    if (!userSockets || !conversationSockets) return false;

    return [...userSockets].some((socketId) =>
      conversationSockets.has(socketId),
    );
  }
}
