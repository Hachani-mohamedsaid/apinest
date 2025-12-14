import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StravaController } from './strava.controller';
import { StravaService } from './strava.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
  ],
  controllers: [StravaController],
  providers: [StravaService],
  exports: [StravaService],
})
export class StravaModule {}

