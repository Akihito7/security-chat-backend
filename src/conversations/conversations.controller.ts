import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/auth.guard';
import { JwtAuthGuard } from '../guards/auth.guard';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(
    @Body() { username }: CreateConversationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.conversationsService.create(username, request.user.sub);
  }
}
