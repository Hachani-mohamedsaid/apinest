import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivityMessagesService } from './activity-messages.service';
import { ActivityRoomGateway } from './activity-room.gateway';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { ActivityMessage, ActivityMessageSchema } from './schemas/activity-message.schema';
import { UsersModule } from '../users/users.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: ActivityMessage.name, schema: ActivityMessageSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    ChatsModule,
  ],
  controllers: [ActivitiesController],
  providers: [
    ActivitiesService,
    ActivityMessagesService,
    ActivityRoomGateway,
  ],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}

