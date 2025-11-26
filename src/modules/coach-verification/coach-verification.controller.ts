import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoachVerificationService } from './coach-verification.service';
import { CoachVerificationAIRequestDto } from './dto/verify-ai-request.dto';
import { CoachVerificationAIResponseDto } from './dto/verify-ai-response.dto';

@ApiTags('Coach Verification')
@Controller('coach-verification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoachVerificationController {
  constructor(
    private readonly coachVerificationService: CoachVerificationService,
  ) {}

  @Post('verify-with-ai')
  @ApiOperation({ 
    summary: 'Verify coach with AI (ChatGPT)',
    description: 'Uses ChatGPT to analyze user data and documents to verify if the user is a professional coach/trainer'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Coach verification completed successfully',
    type: CoachVerificationAIResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - JWT token required'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid input data'
  })
  async verifyCoachWithAI(
    @Request() req,
    @Body() requestDto: CoachVerificationAIRequestDto,
  ): Promise<CoachVerificationAIResponseDto> {
    return this.coachVerificationService.verifyCoachWithAI(requestDto);
  }
}

