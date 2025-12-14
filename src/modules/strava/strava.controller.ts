import { Controller, Get, Query, Redirect, Logger, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StravaService } from './strava.service';

@ApiTags('strava')
@Controller()
export class StravaController {
  private readonly logger = new Logger(StravaController.name);

  constructor(private readonly stravaService: StravaService) {}

  @Get('strava/callback')
  @ApiOperation({
    summary: 'Strava OAuth callback redirect',
    description:
      'Handles Strava OAuth callback and redirects to the mobile app via deep link',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Authorization code from Strava',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Error code from Strava',
  })
  @ApiQuery({
    name: 'error_description',
    required: false,
    description: 'Error description from Strava',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to mobile app deep link',
  })
  @Redirect()
  stravaCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
  ) {
    this.logger.log(
      `[Strava] Callback received - code: ${code ? 'present' : 'missing'}, error: ${error || 'none'}`,
    );

    // En cas d'erreur
    if (error) {
      this.logger.warn(
        `[Strava] OAuth error: ${error} - ${errorDescription || 'No description'}`,
      );

      const errorUrl = `nexofitness://strava/callback?error=${encodeURIComponent(error)}`;

      if (errorDescription) {
        return {
          url: `${errorUrl}&error_description=${encodeURIComponent(errorDescription)}`,
        };
      }

      return { url: errorUrl };
    }

    // Vérifier que le code est présent
    if (!code) {
      this.logger.error('[Strava] No authorization code received');
      return {
        url: `nexofitness://strava/callback?error=missing_code&error_description=${encodeURIComponent('No authorization code received from Strava')}`,
      };
    }

    // Rediriger vers l'app avec le code d'autorisation
    this.logger.log(`[Strava] Redirecting to app with authorization code`);
    return { url: `nexofitness://strava/callback?code=${code}` };
  }

  /**
   * POST /strava/oauth/callback
   * Échange le code d'autorisation avec Strava et stocke les tokens
   */
  @Post('strava/oauth/callback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Exchange Strava OAuth code for tokens',
    description: 'Exchanges the authorization code with Strava API and stores tokens for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Strava account connected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Strava account connected successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid code or error from Strava' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async oauthCallback(@Request() req, @Body() body: { code: string }) {
    const userId = req.user.sub || req.user._id?.toString();

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    if (!body.code) {
      throw new Error('Authorization code is required');
    }

    this.logger.log(`[Strava] OAuth callback for user ${userId}`);

    try {
      // Échanger le code contre les tokens
      const tokenData = await this.stravaService.exchangeCodeForToken(body.code);

      // Stocker les tokens pour l'utilisateur
      await this.stravaService.storeStravaTokens(
        userId,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_at,
        tokenData.athlete.id,
      );

      this.logger.log(`✅ Strava account connected successfully for user ${userId}`);

      return {
        message: 'Strava account connected successfully',
      };
    } catch (error: any) {
      this.logger.error(`[Strava] Error connecting account for user ${userId}:`, error.message);
      throw error;
    }
  }
}

