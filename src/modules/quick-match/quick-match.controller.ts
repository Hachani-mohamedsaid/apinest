import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuickMatchService } from './quick-match.service';
import { LikeProfileDto } from './dto/like-profile.dto';
import { PassProfileDto } from './dto/pass-profile.dto';

@ApiTags('quick-match')
@Controller('quick-match')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickMatchController {
  constructor(private readonly quickMatchService: QuickMatchService) {}

  @Get('profiles')
  @ApiOperation({
    summary: 'Get compatible profiles based on sports interests',
    description:
      'Returns users who have at least one common sport/interest. Excludes already liked, passed, or matched profiles.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Results per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of compatible profiles retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfiles(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user._id.toString();
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    const result = await this.quickMatchService.getCompatibleProfiles(
      userId,
      pageNum,
      limitNum,
    );
    
    return {
      profiles: result.profiles.map((profile) => this.mapToResponse(profile)),
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limitNum,
      },
    };
  }

  @Post('like')
  @ApiOperation({
    summary: 'Like a profile',
    description:
      'Records a like. If the other user also liked you, creates a match.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile liked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or profile not found' })
  @ApiResponse({ status: 409, description: 'Profile already liked or passed' })
  async likeProfile(@Request() req, @Body() body: LikeProfileDto) {
    const userId = req.user._id.toString();
    const { profileId } = body;

    // Enregistrer le like (retourne isMatch)
    const { isMatch } = await this.quickMatchService.likeProfile(userId, profileId);

    if (isMatch) {
      // Récupérer le profil matché directement
      const matchedProfile = await this.quickMatchService.getProfileById(
        profileId,
      );

      if (matchedProfile) {
        return {
          isMatch: true,
          matchedProfile: this.mapToResponse(matchedProfile),
        };
      }
    }

    return {
      isMatch: false,
      matchedProfile: null,
    };
  }

  @Post('pass')
  @ApiOperation({
    summary: 'Pass on a profile',
    description:
      'Records a pass. This profile will not appear again in future searches.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile passed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or profile not found' })
  @ApiResponse({ status: 409, description: 'Profile already passed or liked' })
  async passProfile(@Request() req, @Body() body: PassProfileDto) {
    const userId = req.user._id.toString();
    const { profileId } = body;

    await this.quickMatchService.passProfile(userId, profileId);

    return { success: true };
  }

  @Get('matches')
  @ApiOperation({ summary: 'Get all matches for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of matches retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMatches(@Request() req) {
    const userId = req.user._id.toString();
    const matches = await this.quickMatchService.getMatches(userId);
    return matches;
  }

  @Get('likes-received')
  @ApiOperation({
    summary: 'Get likes received by the current user',
    description:
      'Returns all users who have liked the current user\'s profile. Includes match status.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of likes received retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLikesReceived(@Request() req) {
    const userId = req.user._id.toString();
    const likes = await this.quickMatchService.getLikesReceived(userId);

    // Mapper les likes vers le format de réponse attendu
    const likesResponse = await Promise.all(
      likes.map(async (like) => {
        const likeObj = like.toObject();
        const fromUser = likeObj.fromUser as any;

        // Récupérer le matchId si c'est un match
        let matchId: string | null = null;
        if (likeObj.isMatch) {
          const match = await this.quickMatchService.getMatchByUsers(
            userId,
            fromUser._id.toString(),
          );
          matchId = match?._id.toString() || null;
        }

        return {
          likeId: likeObj._id.toString(),
          fromUser: {
            _id: fromUser._id.toString(),
            id: fromUser._id.toString(),
            name: fromUser.name,
            profileImageUrl: fromUser.profileImageUrl,
            avatarUrl:
              fromUser.profileImageUrl || fromUser.profileImageThumbnailUrl,
          },
          isMatch: likeObj.isMatch,
          matchId: matchId,
          createdAt: likeObj.createdAt
            ? new Date(likeObj.createdAt).toISOString()
            : new Date().toISOString(),
        };
      }),
    );

    return {
      likes: likesResponse,
    };
  }

  /**
   * Mappe un profil utilisateur vers le format de réponse attendu par Android
   */
  private mapToResponse(profile: any) {
    return {
      _id: profile._id.toString(),
      id: profile._id.toString(),
      name: profile.name,
      age: this.calculateAge(profile.dateOfBirth),
      email: profile.email,
      avatarUrl: profile.profileImageUrl || profile.profileImageThumbnailUrl,
      coverImageUrl:
        profile.profileImageUrl || profile.profileImageThumbnailUrl,
      location: profile.location,
      distance: profile.distance || null,
      bio: profile.about,
      about: profile.about,
      sportsInterests: profile.sportsInterests || [],
      sports: this.mapSports(profile.sportsInterests),
      interests: profile.sportsInterests || [], // Utiliser sportsInterests comme interests
      rating: 0, // À implémenter si vous avez un système de rating
      activitiesJoined: profile.activitiesCount || 0,
      profileImageUrl: profile.profileImageUrl,
    };
  }

  /**
   * Calcule l'âge à partir de la date de naissance
   */
  private calculateAge(dateOfBirth: string | undefined): number {
    if (!dateOfBirth) return 0;

    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age > 0 ? age : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Mappe les sportsInterests vers un format détaillé avec icônes
   */
  private mapSports(sportsInterests: string[] | undefined): any[] {
    if (!sportsInterests || sportsInterests.length === 0) return [];

    return sportsInterests.map((sportName) => ({
      name: sportName,
      icon: this.getSportIcon(sportName),
      level: 'Intermediate', // Par défaut, ou récupérer depuis le profil utilisateur
    }));
  }

  /**
   * Retourne l'icône emoji pour un sport
   */
  private getSportIcon(sportName: string): string {
    const icons: { [key: string]: string } = {
      Football: '⚽',
      Basketball: '🏀',
      Running: '🏃',
      Cycling: '🚴',
      Tennis: '🎾',
      Swimming: '🏊',
      Yoga: '🧘',
      Volleyball: '🏐',
      Soccer: '⚽',
      Badminton: '🏸',
      TableTennis: '🏓',
      Golf: '⛳',
      Skiing: '⛷️',
      Snowboarding: '🏂',
      Surfing: '🏄',
      Climbing: '🧗',
      Boxing: '🥊',
      MartialArts: '🥋',
      Hiking: '🥾',
      Dance: '💃',
      Pilates: '🧘‍♀️',
      Zumba: '🎵',
      CrossFit: '💪',
    };

    return icons[sportName] || '🏃';
  }
}

