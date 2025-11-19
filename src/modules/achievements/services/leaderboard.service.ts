import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { LeaderboardCache, LeaderboardCacheDocument } from '../schemas/leaderboard-cache.schema';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(LeaderboardCache.name)
    private readonly leaderboardCacheModel: Model<LeaderboardCacheDocument>,
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
}

