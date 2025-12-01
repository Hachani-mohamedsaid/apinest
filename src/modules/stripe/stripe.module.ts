import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}

