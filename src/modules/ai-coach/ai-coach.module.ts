import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AICoachController } from './ai-coach.controller';
import { AICoachService } from './ai-coach.service';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [AICoachController],
  providers: [AICoachService],
  exports: [AICoachService],
})
export class AICoachModule {}

