import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIMatchmakerService } from './ai-matchmaker.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@Controller('ai-matchmaker')
@UseGuards(JwtAuthGuard)
export class AIMatchmakerController {
  constructor(private readonly aiMatchmakerService: AIMatchmakerService) {}

  @Post('chat')
  async chat(
    @Request() req,
    @Body() chatRequest: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.aiMatchmakerService.chat(req.user._id.toString(), chatRequest);
  }
}

