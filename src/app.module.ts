import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/mail/mail.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ChatsModule } from './modules/chats/chats.module';
import { QuickMatchModule } from './modules/quick-match/quick-match.module';
import { AIMatchmakerModule } from './modules/ai-matchmaker/ai-matchmaker.module';
import { AICoachModule } from './modules/ai-coach/ai-coach.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { StravaModule } from './modules/strava/strava.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI') || process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-db';
        
        // Log pour le débogage (ne pas logger le mot de passe complet en production)
        if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
          console.warn('⚠️  WARNING: Using localhost MongoDB. Make sure MONGODB_URI is set in Railway environment variables.');
        } else {
          console.log('✅ MongoDB URI configured (not localhost)');
        }
        
        return {
          uri: mongoUri,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    MailModule,
    ActivitiesModule,
    ChatsModule,
    QuickMatchModule,
    AIMatchmakerModule,
    AICoachModule,
    AchievementsModule,
    StravaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

