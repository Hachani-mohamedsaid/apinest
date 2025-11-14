import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AIMatchmakerController } from './ai-matchmaker.controller';
import { AIMatchmakerService } from './ai-matchmaker.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [AIMatchmakerController],
  providers: [AIMatchmakerService],
})
export class AIMatchmakerModule {}

