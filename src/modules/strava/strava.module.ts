import { Module } from '@nestjs/common';
import { StravaController } from './strava.controller';

@Module({
  controllers: [StravaController],
})
export class StravaModule {}

