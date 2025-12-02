import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhiteLabelController } from './white-label.controller';
import { WhiteLabelService } from './white-label.service';
import { WhiteLabel, WhiteLabelSchema } from './white-label.schema';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhiteLabel.name, schema: WhiteLabelSchema },
    ]),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [WhiteLabelController],
  providers: [WhiteLabelService],
  exports: [WhiteLabelService],
})
export class WhiteLabelModule {}

