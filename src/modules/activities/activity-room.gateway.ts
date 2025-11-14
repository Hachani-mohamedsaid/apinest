import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ActivityMessagesService } from './activity-messages.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configurer selon vos besoins en production
    credentials: true,
  },
  namespace: '/activity-room',
})
@Injectable()
export class ActivityRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ActivityRoomGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // activityId -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private activityMessagesService: ActivityMessagesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Authentifier l'utilisateur via le token JWT
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided for ${client.id}`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET') || 'default-secret-key';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      // Le payload contient 'sub' comme ID utilisateur (selon JwtStrategy)
      client.data.userId = payload.sub || payload.userId;
      client.data.userEmail = payload.email;

      this.logger.log(`Client connected: ${client.id}, User: ${client.data.userId}`);
    } catch (error) {
      this.logger.error(`WebSocket authentication failed for ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Retirer l'utilisateur de toutes les salles
    this.connectedUsers.forEach((users, activityId) => {
      users.delete(client.id);
      if (users.size === 0) {
        this.connectedUsers.delete(activityId);
      }
    });
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-activity')
  handleJoinActivity(
    @MessageBody() data: { activityId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { activityId } = data;
    const userId = client.data.userId;

    if (!activityId || !userId) {
      return { error: 'Missing activityId or userId' };
    }

    // Rejoindre la room Socket.IO pour cette activité
    client.join(`activity:${activityId}`);

    // Enregistrer la connexion
    if (!this.connectedUsers.has(activityId)) {
      this.connectedUsers.set(activityId, new Set());
    }
    this.connectedUsers.get(activityId)!.add(client.id);

    this.logger.log(`User ${userId} joined activity ${activityId}`);

    // Notifier les autres utilisateurs (optionnel)
    client.to(`activity:${activityId}`).emit('user-joined', {
      userId,
      activityId,
    });

    return { success: true, activityId };
  }

  @SubscribeMessage('leave-activity')
  handleLeaveActivity(
    @MessageBody() data: { activityId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { activityId } = data;
    const userId = client.data.userId;

    client.leave(`activity:${activityId}`);

    if (this.connectedUsers.has(activityId)) {
      this.connectedUsers.get(activityId)!.delete(client.id);
      if (this.connectedUsers.get(activityId)!.size === 0) {
        this.connectedUsers.delete(activityId);
      }
    }

    client.to(`activity:${activityId}`).emit('user-left', {
      userId,
      activityId,
    });

    return { success: true };
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: { activityId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { activityId, content } = data;
    const userId = client.data.userId;

    if (!activityId || !content || !userId) {
      return { error: 'Missing required fields' };
    }

    try {
      // Sauvegarder le message dans la base de données
      const message = await this.activityMessagesService.sendMessage(
        activityId,
        userId,
        content,
      );

      // Diffuser le message à tous les utilisateurs dans la room
      // Le message.sender est déjà populé par le service
      const sender = message.sender as any;
      this.server.to(`activity:${activityId}`).emit('new-message', {
        _id: message._id,
        activity: message.activity,
        sender: {
          _id: sender._id || sender,
          name: sender.name || '',
          profileImageUrl: sender.profileImageUrl || null,
        },
        content: message.content,
        createdAt: (message as any).createdAt || new Date(),
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return { error: 'Failed to send message', details: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { activityId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const { activityId, isTyping } = data;
    const userId = client.data.userId;

    // Diffuser l'état de frappe aux autres utilisateurs
    client.to(`activity:${activityId}`).emit('user-typing', {
      userId,
      isTyping,
    });
  }
}

