import { Module } from '@nestjs/common';
import { CoachVerificationController } from './coach-verification.controller';
import { CoachVerificationService } from './coach-verification.service';

@Module({
  controllers: [CoachVerificationController],
  providers: [CoachVerificationService],
  exports: [CoachVerificationService],
})
export class CoachVerificationModule {}

