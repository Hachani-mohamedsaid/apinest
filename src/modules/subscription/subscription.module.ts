import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { Subscription, SubscriptionSchema } from './subscription.schema';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { StripeModule } from '../stripe/stripe.module';
import { UsersModule } from '../users/users.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { SubscriptionNotificationService } from './services/subscription-notification.service';
import { SubscriptionScheduler } from './subscription.scheduler';
import { SubscriptionLimitGuard } from './subscription.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => StripeModule),
    UsersModule,
    AchievementsModule,
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionLimitGuard,
    SubscriptionNotificationService,
    SubscriptionScheduler,
  ],
  exports: [
    SubscriptionService,
    SubscriptionLimitGuard,
    SubscriptionNotificationService,
  ],
})
export class SubscriptionModule {}

