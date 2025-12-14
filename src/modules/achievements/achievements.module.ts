import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { XpService } from './services/xp.service';
import { LevelService } from './services/level.service';
import { StreakService } from './services/streak.service';
import { BadgeService } from './services/badge.service';
import { ChallengeService } from './services/challenge.service';
import { LeaderboardService } from './services/leaderboard.service';
import { LeaderboardEmailService } from './services/leaderboard-email.service';
import { NotificationService } from './services/notification.service';
import { Level, LevelSchema } from './schemas/level.schema';
import { BadgeDefinition, BadgeDefinitionSchema } from './schemas/badge-definition.schema';
import { UserBadge, UserBadgeSchema } from './schemas/user-badge.schema';
import { ChallengeDefinition, ChallengeDefinitionSchema } from './schemas/challenge-definition.schema';
import { UserChallenge, UserChallengeSchema } from './schemas/user-challenge.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { UserStreak, UserStreakSchema } from './schemas/user-streak.schema';
import { LeaderboardCache, LeaderboardCacheSchema } from './schemas/leaderboard-cache.schema';
import { LeaderboardCouponEmail, LeaderboardCouponEmailSchema } from './schemas/leaderboard-coupon-email.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UsersModule,
    MailModule,
    MongooseModule.forFeature([
      { name: Level.name, schema: LevelSchema },
      { name: BadgeDefinition.name, schema: BadgeDefinitionSchema },
      { name: UserBadge.name, schema: UserBadgeSchema },
      { name: ChallengeDefinition.name, schema: ChallengeDefinitionSchema },
      { name: UserChallenge.name, schema: UserChallengeSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: UserStreak.name, schema: UserStreakSchema },
      { name: LeaderboardCache.name, schema: LeaderboardCacheSchema },
      { name: LeaderboardCouponEmail.name, schema: LeaderboardCouponEmailSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: Activity.name, schema: ActivitySchema }, // Pour compter les activités créées
    ]),
  ],
  controllers: [AchievementsController],
  providers: [
    AchievementsService,
    XpService,
    LevelService,
    StreakService,
    BadgeService,
    ChallengeService,
    LeaderboardService,
    LeaderboardEmailService,
    NotificationService,
  ],
  // Les services sont déjà disponibles via exports, mais on doit s'assurer que les dépendances circulaires sont gérées
  exports: [
    AchievementsService, // Exporter AchievementsService pour l'utiliser dans AuthModule
    XpService,
    StreakService,
    BadgeService,
    ChallengeService,
    LeaderboardService,
    LeaderboardEmailService,
    NotificationService,
  ],
})
export class AchievementsModule {}

