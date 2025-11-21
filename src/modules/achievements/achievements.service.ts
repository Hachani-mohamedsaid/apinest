import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LevelService } from './services/level.service';
import { BadgeService } from './services/badge.service';
import { ChallengeService } from './services/challenge.service';
import { LeaderboardService } from './services/leaderboard.service';
import { AchievementsSummaryDto } from './dto/achievements-summary.dto';
import { BadgesResponseDto } from './dto/badges-response.dto';
import { ChallengesResponseDto } from './dto/challenges-response.dto';
import { LeaderboardResponseDto } from './dto/leaderboard-response.dto';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly levelService: LevelService,
    private readonly badgeService: BadgeService,
    private readonly challengeService: ChallengeService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * Get achievements summary for user
   */
  async getSummary(userId: string): Promise<AchievementsSummaryDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new Error('User not found');
    }

    const totalXp = user.totalXp || 0;
    const levelInfo = this.levelService.calculateLevel(totalXp);

    // Get badge count
    const userBadges = await this.badgeService.getUserBadges(userId);
    const totalBadges = userBadges.length;

    return {
      level: {
        currentLevel: levelInfo.level,
        totalXp,
        xpForNextLevel: levelInfo.xpForNextLevel,
        currentLevelXp: levelInfo.xpProgress,
        progressPercentage: levelInfo.progressPercentage,
      },
      stats: {
        totalBadges,
        currentStreak: user.currentStreak || 0,
        bestStreak: user.bestStreak || 0,
      },
    };
  }

  /**
   * Get user badges (earned and in progress)
   */
  async getBadges(userId: string): Promise<BadgesResponseDto> {
    const earnedBadges = await this.badgeService.getUserBadges(userId);
    const inProgress = await this.badgeService.getBadgeProgress(userId);

    return {
      earnedBadges: earnedBadges.map((ub: any) => ({
        _id: ub.badgeId._id.toString(),
        name: ub.badgeId.name,
        description: ub.badgeId.description,
        iconUrl: ub.badgeId.iconUrl,
        rarity: ub.badgeId.rarity,
        category: ub.badgeId.category,
        earnedAt: ub.earnedAt,
      })),
      inProgress: inProgress.map((item) => ({
        badge: {
          _id: item.badge._id.toString(),
          name: item.badge.name,
          description: item.badge.description,
          iconUrl: item.badge.iconUrl,
          rarity: item.badge.rarity,
          category: item.badge.category,
        },
        currentProgress: item.currentProgress,
        target: item.target,
        percentage: item.percentage,
      })),
    };
  }

  /**
   * Get user active challenges
   */
  async getChallenges(userId: string): Promise<ChallengesResponseDto> {
    const activeChallenges = await this.challengeService.getUserActiveChallenges(userId);

    return {
      activeChallenges: activeChallenges.map((item) => ({
        _id: item.challenge._id.toString(),
        name: item.challenge.name,
        description: item.challenge.description,
        challengeType: item.challenge.challengeType,
        xpReward: item.challenge.xpReward,
        currentProgress: item.currentProgress,
        target: item.target,
        daysLeft: item.daysLeft,
        expiresAt: item.expiresAt,
      })),
    };
  }

  /**
   * Get leaderboard with user's position
   */
  async getLeaderboard(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<LeaderboardResponseDto> {
    const leaderboardData = await this.leaderboardService.getLeaderboard(page, limit);
    const userPosition = await this.leaderboardService.getUserLeaderboardPosition(userId);

    return {
      currentUser: userPosition
        ? {
            ...userPosition,
            isCurrentUser: true,
          }
        : undefined,
      leaderboard: leaderboardData.leaderboard,
      page: leaderboardData.page,
      totalPages: leaderboardData.totalPages,
    };
  }

  /**
   * Initialize achievements for a new user
   * Called when a new user is created
   */
  async initializeUserAchievements(userId: string): Promise<void> {
    try {
      this.logger.log(`Initializing achievements for user ${userId}`);

      // Initialize user streak if needed (streak service handles it automatically)
      // Ensure user has default values
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        this.logger.warn(`User ${userId} not found when initializing achievements`);
        return;
      }

      // Activate challenges for the user (this creates initial challenges)
      await this.challengeService.activateChallengesForUser(userId);

      this.logger.log(`Achievements initialized for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error initializing achievements for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Called when an activity is completed
   * This method orchestrates all achievement-related updates
   */
  async onActivityCompleted(
    userId: string,
    activityData: {
      sportType: string;
      date?: Date;
      durationMinutes?: number;
      distanceKm?: number;
      isHost?: boolean;
    },
  ): Promise<void> {
    try {
      this.logger.log(`Processing activity completion for user ${userId}`);

      // This is already handled in ActivitiesService.completeActivity()
      // But we keep this method for consistency and future use
      // The actual work is done by:
      // 1. XpService.addXp() - Already called
      // 2. StreakService.updateStreak() - Already called
      // 3. BadgeService.checkAndAwardBadges() - Already called
      // 4. ChallengeService.updateChallengeProgress() - Already called

      this.logger.log(`Activity completion processed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error processing activity completion for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Called when an activity is created
   * Vérifie et débloque les badges de création d'activité
   */
  async onActivityCreated(userId: string): Promise<void> {
    try {
      this.logger.log(`Processing activity creation for user ${userId}`);

      // Vérifier et débloquer les badges de création
      await this.badgeService.checkAndAwardBadges(userId, 'activity_created', {
        action: 'create_activity',
      });

      this.logger.log(`Activity creation processed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error processing activity creation for user ${userId}: ${error.message}`);
      // Ne pas bloquer la création d'activité si l'achievement échoue
    }
  }
}

