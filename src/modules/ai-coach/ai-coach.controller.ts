import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AICoachService } from './ai-coach.service';
import { AICoachSuggestionsRequestDto } from './dto/suggestions-request.dto';
import { AICoachSuggestionsResponseDto } from './dto/suggestions-response.dto';

@ApiTags('AI Coach')
@Controller('ai-coach')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AICoachController {
  constructor(private readonly aiCoachService: AICoachService) {}

  @Post('suggestions')
  @ApiOperation({
    summary: 'Get personalized activity suggestions and tips',
    description:
      'Uses Google Gemini AI to generate personalized activity suggestions and tips based on Strava data and user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions generated successfully',
    type: AICoachSuggestionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  async getSuggestions(
    @Request() req,
    @Body() request: AICoachSuggestionsRequestDto,
  ): Promise<AICoachSuggestionsResponseDto> {
    const userId = req.user._id.toString();
    return this.aiCoachService.getPersonalizedSuggestions(userId, request);
  }
}

