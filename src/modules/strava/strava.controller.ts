import { Controller, Get, Query, Redirect, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('strava')
@Controller()
export class StravaController {
  private readonly logger = new Logger(StravaController.name);

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
}

