import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/auth.guard';
import { JwtAuthGuard } from '../guards/auth.guard';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.conversationsService.findAll(request.user.sub);
  }

  @Get(':conversationId')
  findById(
    @Param('conversationId', new ParseUUIDPipe({ version: '4' }))
    conversationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.conversationsService.findById(
      conversationId,
      request.user.sub,
    );
  }

  @Post()
  create(
    @Body() { username }: CreateConversationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.conversationsService.create(username, request.user.sub);
  }
}
