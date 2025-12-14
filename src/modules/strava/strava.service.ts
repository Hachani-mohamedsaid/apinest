import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);
  private readonly stravaClientId: string;
  private readonly stravaClientSecret: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.stravaClientId = this.configService.get<string>('STRAVA_CLIENT_ID') || '';
    this.stravaClientSecret = this.configService.get<string>('STRAVA_CLIENT_SECRET') || '';

    if (!this.stravaClientId || !this.stravaClientSecret) {
      this.logger.warn('⚠️ STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not configured');
    } else {
      this.logger.log('✅ Strava service initialized');
    }
  }

  /**
   * Échange le code d'autorisation Strava contre un access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: { id: number };
  }> {
    if (!this.stravaClientId || !this.stravaClientSecret) {
      throw new BadRequestException('Strava OAuth not configured on server');
    }

    try {
      this.logger.log('Exchanging Strava authorization code for token...');

      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.stravaClientId,
        client_secret: this.stravaClientSecret,
        code: code,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_at, athlete } = response.data;

      if (!access_token || !refresh_token || !expires_at || !athlete?.id) {
        throw new BadRequestException('Invalid response from Strava');
      }

      this.logger.log(`✅ Strava token exchange successful for athlete ${athlete.id}`);

      return {
        access_token,
        refresh_token,
        expires_at,
        athlete,
      };
    } catch (error: any) {
      this.logger.error('Error exchanging Strava code:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to exchange Strava authorization code',
      );
    }
  }

  /**
   * Stocke les tokens Strava pour un utilisateur
   */
  async storeStravaTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    stravaUserId: number,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.stravaAccessToken = accessToken;
    user.stravaRefreshToken = refreshToken;
    user.stravaExpiresAt = expiresAt;
    user.stravaUserId = stravaUserId;

    await user.save();

    this.logger.log(`✅ Strava tokens stored for user ${userId}`);

    return user;
  }

  /**
   * Rafraîchit le token Strava si nécessaire
   */
  async refreshStravaTokenIfNeeded(userId: string): Promise<string | null> {
    const user = await this.userModel.findById(userId).exec();

    if (!user || !user.stravaRefreshToken) {
      return null;
    }

    // Vérifier si le token est expiré (avec une marge de 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (user.stravaExpiresAt && user.stravaExpiresAt > now + 300) {
      // Token encore valide
      return user.stravaAccessToken || null;
    }

    // Token expiré, rafraîchir
    try {
      this.logger.log(`Refreshing Strava token for user ${userId}...`);

      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.stravaClientId,
        client_secret: this.stravaClientSecret,
        refresh_token: user.stravaRefreshToken,
        grant_type: 'refresh_token',
      });

      const { access_token, refresh_token, expires_at } = response.data;

      user.stravaAccessToken = access_token;
      user.stravaRefreshToken = refresh_token || user.stravaRefreshToken;
      user.stravaExpiresAt = expires_at;
      await user.save();

      this.logger.log(`✅ Strava token refreshed for user ${userId}`);

      return access_token;
    } catch (error: any) {
      this.logger.error('Error refreshing Strava token:', error.response?.data || error.message);
      return null;
    }
  }
}

