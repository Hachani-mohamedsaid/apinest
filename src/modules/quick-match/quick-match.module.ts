import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuickMatchController } from './quick-match.controller';
import { QuickMatchService } from './quick-match.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { Match, MatchSchema } from './schemas/match.schema';
import { Pass, PassSchema } from './schemas/pass.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: Like.name, schema: LikeSchema },
      { name: Match.name, schema: MatchSchema },
      { name: Pass.name, schema: PassSchema },
    ]),
  ],
  controllers: [QuickMatchController],
  providers: [QuickMatchService],
  exports: [QuickMatchService],
})
export class QuickMatchModule {}

