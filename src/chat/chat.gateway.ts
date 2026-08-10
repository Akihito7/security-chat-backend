import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { allowedOrigins } from '../cors.config';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection {
  constructor(private readonly chatService: ChatService) {}

  async handleConnection(socket: Socket) {
    try {
      const currentUser = await this.chatService.authenticate(socket);

      socket.data.userId = currentUser.sub;

      await socket.join(`user:${currentUser.sub}`);
    } catch {
      socket.disconnect(true);
    }
  }

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
