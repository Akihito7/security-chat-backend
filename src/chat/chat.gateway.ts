import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('send-message')
  sendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
    },
  ) {
    return this.chatService.sendMessage({ ...data, socket });
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { conversationId }: { conversationId: string },
  ) {
    await this.chatService.joinConversation(conversationId, socket);
  }

  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { conversationId }: { conversationId: string },
  ) {
    await this.chatService.leaveConversation(conversationId, socket);
  }
}
