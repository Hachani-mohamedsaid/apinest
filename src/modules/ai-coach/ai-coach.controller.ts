import { Controller, Post, Body, UseGuards, Request, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AICoachService } from './ai-coach.service';
import { ActivitiesService } from '../activities/activities.service';
import { UsersService } from '../users/users.service';
import { AICoachSuggestionsRequestDto } from './dto/suggestions-request.dto';
import { AICoachSuggestionsResponseDto } from './dto/suggestions-response.dto';
import { PersonalizedTipsRequestDto } from './dto/personalized-tips-request.dto';
import { PersonalizedTipsResponseDto } from './dto/personalized-tips-response.dto';
import { YouTubeVideosRequestDto } from './dto/youtube-videos-request.dto';
import { YouTubeVideosResponseDto } from './dto/youtube-videos-response.dto';

@ApiTags('AI Coach')
@Controller('ai-coach')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AICoachController {
  constructor(
    private readonly aiCoachService: AICoachService,
    private readonly activitiesService: ActivitiesService,
    private readonly usersService: UsersService,
  ) {}

  @Post('suggestions')
  @ApiOperation({
    summary: 'Get personalized activity suggestions and tips',
    description:
      'Uses ChatGPT (or Gemini as fallback) to generate personalized activity suggestions and tips based on Strava data, user profile, and activity history',
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
    const userId = req.user.sub || req.user._id?.toString();

    // ✅ Récupérer les données de l'application
    const createdActivities = await this.activitiesService.getActivitiesByCreator(userId);
    const createdActivityIds = createdActivities.map((a) => a._id.toString());

    // Récupérer les activités auxquelles l'utilisateur a participé
    const allActivities = await this.activitiesService.findAll('public', userId);
    const joinedActivities = allActivities.filter((a) =>
      a.participantIds?.some((id) => id.toString() === userId),
    );
    const joinedActivityIds = joinedActivities.map((a) => a._id.toString());

    // Récupérer le profil utilisateur pour la localisation
    const userProfile = await this.usersService.findById(userId);

    // ✅ Construire la requête enrichie
    const enrichedRequest: AICoachSuggestionsRequestDto = {
      ...request,
      // Les données Strava sont envoyées par le frontend
      // stravaData: request.stravaData, // Déjà dans la requête
      recentAppActivities: request.recentAppActivities || [], // Peut être envoyé par le frontend
      joinedActivities: request.joinedActivities || joinedActivityIds,
      createdActivities: request.createdActivities || createdActivityIds,
      location: request.location || userProfile?.location || undefined,
      preferredTimeOfDay: request.preferredTimeOfDay || undefined,
    };

    return this.aiCoachService.getPersonalizedSuggestions(userId, enrichedRequest);
  }

  /**
   * Génère des conseils personnalisés avec ChatGPT
   * POST /ai-coach/personalized-tips
   */
  @Post('personalized-tips')
  @ApiOperation({
    summary: 'Generate personalized tips with ChatGPT',
    description: 'Uses OpenAI ChatGPT to generate personalized fitness tips based on user statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Personalized tips generated successfully',
    type: PersonalizedTipsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async generatePersonalizedTips(
    @Body() request: PersonalizedTipsRequestDto,
  ): Promise<PersonalizedTipsResponseDto> {
    return this.aiCoachService.generatePersonalizedTips(request);
  }

  /**
   * Récupère des vidéos YouTube pertinentes
   * GET /ai-coach/youtube-videos
   */
  @Get('youtube-videos')
  @ApiOperation({
    summary: 'Get relevant YouTube videos',
    description: 'Fetches relevant fitness and sports tutorial videos from YouTube based on sport preferences',
  })
  @ApiQuery({
    name: 'sportPreferences',
    required: false,
    type: String,
    description: 'Comma-separated string or array of preferred sports (e.g., "Running, Basketball" or ["Running", "Basketball"])',
  })
  @ApiQuery({
    name: 'maxResults',
    required: false,
    type: Number,
    description: 'Maximum number of videos (1-50, default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'YouTube videos retrieved successfully',
    type: YouTubeVideosResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getYouTubeVideos(
    @Query('sportPreferences') sportPreferences?: string | string[],
    @Query('maxResults') maxResults?: number,
  ): Promise<YouTubeVideosResponseDto> {
    // Convertir sportPreferences en array si c'est une string
    let sportPreferencesArray: string[] | undefined;

    if (sportPreferences) {
      if (typeof sportPreferences === 'string') {
        // Si c'est une string, la diviser par virgule
        sportPreferencesArray = sportPreferences
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (Array.isArray(sportPreferences)) {
        // Si c'est déjà un array, l'utiliser tel quel
        sportPreferencesArray = sportPreferences.map((s) => String(s).trim()).filter((s) => s.length > 0);
      }
    }

    const query: YouTubeVideosRequestDto = {
      sportPreferences: sportPreferencesArray,
      maxResults: maxResults ? Number(maxResults) : undefined,
    };

    return this.aiCoachService.getYouTubeVideos(query);
  }
}

