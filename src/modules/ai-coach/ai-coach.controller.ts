import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AICoachService } from './ai-coach.service';
import { AICoachSuggestionsRequestDto } from './dto/suggestions-request.dto';
import { AICoachSuggestionsResponseDto } from './dto/suggestions-response.dto';

@Controller('ai-coach')
@UseGuards(JwtAuthGuard)
export class AICoachController {
  constructor(private readonly aiCoachService: AICoachService) {}

  @Post('suggestions')
  async getSuggestions(
    @Request() req,
    @Body() request: AICoachSuggestionsRequestDto,
  ): Promise<AICoachSuggestionsResponseDto> {
    const userId = req.user._id.toString();
    return this.aiCoachService.getPersonalizedSuggestions(userId, request);
  }
}

