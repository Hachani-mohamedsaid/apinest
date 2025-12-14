import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { LeaderboardCache, LeaderboardCacheDocument } from '../schemas/leaderboard-cache.schema';
import { ActivityLog, ActivityLogDocument } from '../schemas/activity-log.schema';
import { LeaderboardEmailService } from './leaderboard-email.service';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(LeaderboardCache.name)
    private readonly leaderboardCacheModel: Model<LeaderboardCacheDocument>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
    private readonly leaderboardEmailService: LeaderboardEmailService,
  ) {}

  /**
   * Update user's rank in leaderboard cache
   */
  async updateUserRank(userId: string): Promise<void> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return;
      }

      // Calculate rank: count users with more XP + 1
      const usersWithMoreXp = await this.userModel
        .countDocuments({
          totalXp: { $gt: user.totalXp || 0 },
        })
        .exec();

      const rank = usersWithMoreXp + 1;

      // Update or create cache entry
      await this.leaderboardCacheModel
        .findOneAndUpdate(
          { userId },
          {
            userId,
            username: user.name || user.email,
            totalXp: user.totalXp || 0,
            rank,
          },
          { upsert: true, new: true },
        )
        .exec();

      this.logger.debug(`Updated rank for user ${userId}: rank ${rank}`);
    } catch (error) {
      this.logger.error(`Error updating user rank for ${userId}: ${error.message}`);
    }
  }

  /**
   * Get paginated leaderboard
   */
  async getLeaderboard(page: number = 1, limit: number = 20): Promise<{
    leaderboard: Array<{
      rank: number;
      username: string;
      totalXp: number;
      medal?: string;
    }>;
    currentUser?: {
      rank: number;
      username: string;
      totalXp: number;
      isCurrentUser: boolean;
    };
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const totalUsers = await this.leaderboardCacheModel.countDocuments().exec();
      const totalPages = Math.ceil(totalUsers / limit);

      const leaderboardEntries = await this.leaderboardCacheModel
        .find()
        .sort({ rank: 1 })
        .skip(skip)
        .limit(limit)
        .exec();

      const leaderboard = leaderboardEntries.map((entry) => {
        const medal = this.getMedal(entry.rank);
        return {
          rank: entry.rank,
          username: entry.username,
          totalXp: entry.totalXp,
          ...(medal && { medal }),
        };
      });

      return {
        leaderboard,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Error getting leaderboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's leaderboard position
   */
  async getUserLeaderboardPosition(userId: string): Promise<{
    rank: number;
    username: string;
    totalXp: number;
  } | null> {
    try {
      const cache = await this.leaderboardCacheModel.findOne({ userId }).exec();
      if (!cache) {
        // If not in cache, calculate and update
        await this.updateUserRank(userId);
        const updatedCache = await this.leaderboardCacheModel.findOne({ userId }).exec();
        if (!updatedCache) {
          return null;
        }
        return {
          rank: updatedCache.rank,
          username: updatedCache.username,
          totalXp: updatedCache.totalXp,
        };
      }

      return {
        rank: cache.rank,
        username: cache.username,
        totalXp: cache.totalXp,
      };
    } catch (error) {
      this.logger.error(`Error getting user leaderboard position: ${error.message}`);
      return null;
    }
  }

  /**
   * Rebuild entire leaderboard cache
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async rebuildLeaderboardCache(): Promise<void> {
    try {
      this.logger.log('Rebuilding leaderboard cache...');

      // Get all users sorted by totalXp descending
      const users = await this.userModel
        .find()
        .select('_id name email totalXp')
        .sort({ totalXp: -1 })
        .exec();

      // Clear existing cache
      await this.leaderboardCacheModel.deleteMany({}).exec();

      // Rebuild cache
      const cacheEntries = users.map((user, index) => ({
        userId: user._id,
        username: user.name || user.email,
        totalXp: user.totalXp || 0,
        rank: index + 1,
      }));

      if (cacheEntries.length > 0) {
        await this.leaderboardCacheModel.insertMany(cacheEntries);
      }

      this.logger.log(`✅ Leaderboard cache rebuilt with ${cacheEntries.length} entries`);
    } catch (error) {
      this.logger.error(`Error rebuilding leaderboard cache: ${error.message}`);
    }
  }

  /**
   * Get medal for rank (gold, silver, bronze)
   */
  private getMedal(rank: number): string | undefined {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return undefined;
  }

  /**
   * Calcule le début de la semaine (Lundi)
   */
  private getStartOfWeek(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour lundi
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + (day === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  /**
   * Récupère le leaderboard hebdomadaire
   */
  async getWeeklyLeaderboard(page: number = 1, limit: number = 50) {
    const startOfWeek = this.getStartOfWeek();
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Récupérer tous les utilisateurs qui ont gagné de l'XP cette semaine
    const weeklyXp = await this.activityLogModel.aggregate([
      {
        $match: {
          date: {
            $gte: startOfWeek,
            $lt: endOfWeek
          }
        }
      },
      {
        $group: {
          _id: '$userId',
          weekTotal: { $sum: '$xpEarned' }
        }
      },
      {
        $sort: { weekTotal: -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ]).exec();

    // Récupérer les informations des utilisateurs
    const userIds = weeklyXp.map(item => item._id);
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('_id name email')
      .exec();

    // Créer un map pour accéder rapidement aux utilisateurs
    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Construire le leaderboard
    const leaderboard = weeklyXp.map((item, index) => {
      const user = userMap.get(item._id.toString());
      return {
        rank: (page - 1) * limit + index + 1,
        userId: item._id.toString(),
        name: user?.name || 'Unknown',
        email: user?.email || '',
        points: item.weekTotal || 0
      };
    });

    return leaderboard;
  }

  /**
   * Récupère le premier du leaderboard hebdomadaire
   */
  async getWeeklyLeaderboardFirst(): Promise<{
    userId: string;
    name: string;
    email: string;
    xp: number;
  } | null> {
    const leaderboard = await this.getWeeklyLeaderboard(1, 1);
    
    if (leaderboard.length === 0) {
      return null;
    }

    const firstPlace = leaderboard[0];
    
    return {
      userId: firstPlace.userId,
      name: firstPlace.name,
      email: firstPlace.email,
      xp: firstPlace.points
    };
  }

  /**
   * Cron Job : Envoie le coupon au premier du leaderboard chaque dimanche à 23h59
   */
  @Cron('59 23 * * 0') // Tous les dimanches à 23h59
  async sendCouponToWeeklyLeader() {
    try {
      this.logger.log('🔄 Checking weekly leaderboard for coupon sending...');
      
      const firstPlace = await this.getWeeklyLeaderboardFirst();
      
      if (!firstPlace) {
        this.logger.log('No leaderboard first place found this week');
        return;
      }

      // Vérifier si le coupon a déjà été envoyé cette semaine
      const alreadySent = await this.leaderboardEmailService.hasCouponBeenSentThisWeek(
        firstPlace.userId
      );

      if (alreadySent) {
        this.logger.log(`Coupon already sent to ${firstPlace.email} this week`);
        return;
      }

      // Envoyer l'email avec le coupon
      await this.leaderboardEmailService.sendLeaderboardCouponEmail(
        firstPlace.userId,
        firstPlace.name,
        firstPlace.email,
        firstPlace.xp
      );

      this.logger.log(`✅ Coupon LEADERBOARD sent to ${firstPlace.email}`);
    } catch (error) {
      this.logger.error('Error sending coupon to leaderboard first:', error);
    }
  }
}

