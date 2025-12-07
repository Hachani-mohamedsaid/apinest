import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Withdraw, WithdrawSchema } from './schemas/withdraw.schema';
import { StripeModule } from '../stripe/stripe.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
    ]),
    StripeModule,
    ActivitiesModule, // Pour accéder à ActivitiesService
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

