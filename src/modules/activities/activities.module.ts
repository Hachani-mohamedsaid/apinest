import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitiesCronService } from './activities-cron.service';
import { ActivityMessagesService } from './activity-messages.service';
import { ActivityRoomGateway } from './activity-room.gateway';
import { CouponService } from './services/coupon.service';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { ActivityMessage, ActivityMessageSchema } from './schemas/activity-message.schema';
import { ActivityLog, ActivityLogSchema } from '../achievements/schemas/activity-log.schema';
import { LeaderboardCouponEmail, LeaderboardCouponEmailSchema } from '../achievements/schemas/leaderboard-coupon-email.schema';
import { Match, MatchSchema } from '../quick-match/schemas/match.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { ChatsModule } from '../chats/chats.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: ActivityMessage.name, schema: ActivityMessageSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: LeaderboardCouponEmail.name, schema: LeaderboardCouponEmailSchema },
      { name: Match.name, schema: MatchSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    ChatsModule,
    AchievementsModule,
    SubscriptionModule,
  ],
  controllers: [ActivitiesController],
  providers: [
    ActivitiesService,
    ActivitiesCronService,
    ActivityMessagesService,
    ActivityRoomGateway,
    CouponService,
  ],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}

