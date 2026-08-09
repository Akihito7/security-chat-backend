import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { ChatRepository } from './chat.repository';

interface SendMessageInput {
  conversationId: string;
  content: string;
  socket: Socket;
}

@Injectable()
export class ChatService {
  constructor(private readonly chatRepository: ChatRepository) {}

  async findChat(conversationId: string) {
    const chat = await this.chatRepository.findChat(conversationId);

    if (!chat) {
      throw new WsException(`Chat with id ${conversationId} not found.`);
    }

    return chat;
  }

  async sendMessage({ conversationId, content, socket }: SendMessageInput) {
    const chat = await this.findChat(conversationId);
    const message = {
      conversationId: chat.id,
      content,
    };

    socket
      .to(`conversation:${conversationId}`)
      .emit('message:received', message);

    return message;
  }

  async joinConversation(conversationId: string, socket: Socket) {
    await this.findChat(conversationId);
    const room = `conversation:${conversationId}`;
    await socket.join(room);
    console.log('conectado', room);
  }

  async leaveConversation(conversationId: string, socket: Socket) {
    await socket.leave(`conversation:${conversationId}`);
  }
}
