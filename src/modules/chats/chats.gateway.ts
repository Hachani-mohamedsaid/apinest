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
import { ChatsService } from './chats.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configurer selon vos besoins
  },
  namespace: '/chats',
})
@Injectable()
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private readonly chatSockets = new Map<string, Set<string>>(); // chatId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatsService: ChatsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extraire le token depuis auth.token
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `Connection rejected: No token provided for socket ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // Vérifier et décoder le JWT
      const jwtSecret =
        this.configService.get<string>('JWT_SECRET') || 'default-secret-key';
      const payload = this.jwtService.verify(token, {
        secret: jwtSecret,
      });
      const userId = payload.sub || payload.id;

      if (!userId) {
        this.logger.warn(
          `Connection rejected: Invalid token for socket ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // Stocker l'association socketId -> userId
      (client as any).userId = userId;

      // Ajouter le socket à la map des sockets de l'utilisateur
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`User ${userId} connected (socket ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId;

    if (userId) {
      // Retirer le socket de la map des sockets de l'utilisateur
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }

      // Retirer le socket de tous les chats
      for (const [chatId, sockets] of this.chatSockets.entries()) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.chatSockets.delete(chatId);
        }
      }

      this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
    }
  }

  /**
   * Rejoindre un chat
   */
  @SubscribeMessage('join-chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = (client as any).userId;
    const { chatId } = data;

    if (!userId || !chatId) {
      return { success: false, error: 'Missing userId or chatId' };
    }

    try {
      // Vérifier que l'utilisateur a accès au chat
      const hasAccess = await this.chatsService.userHasAccessToChat(
        userId,
        chatId,
      );
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      // Rejoindre la room du chat
      client.join(`chat:${chatId}`);

      // Ajouter le socket à la map des sockets du chat
      if (!this.chatSockets.has(chatId)) {
        this.chatSockets.set(chatId, new Set());
      }
      this.chatSockets.get(chatId)!.add(client.id);

      this.logger.log(`User ${userId} joined chat ${chatId}`);

      return { success: true, chatId };
    } catch (error) {
      this.logger.error(`Error joining chat: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Quitter un chat
   */
  @SubscribeMessage('leave-chat')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = (client as any).userId;
    const { chatId } = data;

    if (!userId || !chatId) {
      return { success: false, error: 'Missing userId or chatId' };
    }

    // Quitter la room du chat
    client.leave(`chat:${chatId}`);

    // Retirer le socket de la map des sockets du chat
    const chatSockets = this.chatSockets.get(chatId);
    if (chatSockets) {
      chatSockets.delete(client.id);
      if (chatSockets.size === 0) {
        this.chatSockets.delete(chatId);
      }
    }

    this.logger.log(`User ${userId} left chat ${chatId}`);

    return { success: true, chatId };
  }

  /**
   * Envoyer un message
   */
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; text: string },
  ) {
    const userId = (client as any).userId;
    const { chatId, text } = data;

    if (!userId || !chatId || !text) {
      return { success: false, error: 'Missing required fields' };
    }

    try {
      // Vérifier l'accès au chat
      const hasAccess = await this.chatsService.userHasAccessToChat(
        userId,
        chatId,
      );
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      // Créer le message via le service
      const message = await this.chatsService.sendMessage(
        chatId,
        { text },
        userId,
      );

      // Populate sender si nécessaire
      const populatedMessage = await message.populate(
        'sender',
        'name email profileImageUrl',
      );

      const sender = populatedMessage.sender as any;

      // Diffuser le message à tous les participants du chat
      this.server.to(`chat:${chatId}`).emit('new-message', {
        _id: populatedMessage._id.toString(),
        id: populatedMessage._id.toString(),
        chat: chatId,
        sender: {
          _id: sender._id?.toString() || sender.toString(),
          id: sender._id?.toString() || sender.toString(),
          name: sender.name,
          email: sender.email,
          profileImageUrl: sender.profileImageUrl,
          avatar: sender.profileImageUrl,
        },
        text: populatedMessage.text,
        content: populatedMessage.text,
        createdAt: populatedMessage.createdAt,
        timestamp: populatedMessage.createdAt,
      });

      this.logger.log(`Message sent in chat ${chatId} by user ${userId}`);

      return { success: true, message: populatedMessage };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Indicateur de frappe
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    const userId = (client as any).userId;
    const { chatId, isTyping } = data;

    if (!userId || !chatId) {
      return { success: false, error: 'Missing required fields' };
    }

    try {
      // Vérifier l'accès au chat
      const hasAccess = await this.chatsService.userHasAccessToChat(
        userId,
        chatId,
      );
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      // Diffuser l'indicateur de frappe à tous les autres participants
      client.to(`chat:${chatId}`).emit('user-typing', {
        userId,
        chatId,
        isTyping,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling typing: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marquer les messages comme lus
   */
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = (client as any).userId;
    const { chatId } = data;

    if (!userId || !chatId) {
      return { success: false, error: 'Missing required fields' };
    }

    try {
      // Vérifier l'accès au chat
      const hasAccess = await this.chatsService.userHasAccessToChat(
        userId,
        chatId,
      );
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      // Marquer les messages comme lus via le service
      await this.chatsService.markChatAsRead(chatId, userId);

      // Notifier les autres participants que les messages ont été lus
      client.to(`chat:${chatId}`).emit('message-read', {
        userId,
        chatId,
        readAt: new Date().toISOString(),
      });

      this.logger.log(`Chat ${chatId} marked as read by user ${userId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking chat as read: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Diffuser un nouveau message (appelé depuis le service après création)
   */
  broadcastNewMessage(chatId: string, message: any) {
    this.server.to(`chat:${chatId}`).emit('new-message', {
      _id: message._id?.toString() || message.id,
      id: message._id?.toString() || message.id,
      chat: chatId,
      sender: {
        _id: message.sender._id?.toString() || message.sender.id,
        id: message.sender._id?.toString() || message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
        profileImageUrl: message.sender.profileImageUrl,
        avatar: message.sender.profileImageUrl,
      },
      text: message.text || message.content,
      content: message.text || message.content,
      createdAt: message.createdAt,
      timestamp: message.createdAt,
    });
  }
}

