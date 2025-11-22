import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatsGateway } from './chats.gateway';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => ChatsGateway))
    private readonly chatsGateway: ChatsGateway,
  ) {}

  /**
   * Validate if a string is a valid MongoDB ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
  }

  /**
   * Validate ObjectId and throw BadRequestException if invalid
   */
  private validateObjectId(id: string, fieldName: string = 'ID'): void {
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException(`Invalid ${fieldName}: ${id}. Must be a valid MongoDB ObjectId.`);
    }
  }

  /**
   * Vérifie si un utilisateur a accès à un chat
   * Utilisé par le WebSocket Gateway pour vérifier les permissions
   */
  async userHasAccessToChat(userId: string, chatId: string): Promise<boolean> {
    try {
      const chat = await this.chatModel.findById(chatId).exec();

      if (!chat) {
        return false;
      }

      // Vérifier si l'utilisateur est un participant
      return this.isUserParticipantInChat(chat.participants, userId);
    } catch (error) {
      this.logger.error(`Error checking chat access: ${error.message}`);
      return false;
    }
  }

  /**
   * Vérifie si un utilisateur est participant d'un chat
   * Gère les deux formats : ObjectId (string ou ObjectId) ou objet peuplé
   */
  private isUserParticipantInChat(participants: any[], userId: string): boolean {
    if (!participants || participants.length === 0) {
      return false;
    }

    return participants.some((participant: any) => {
      // Cas 1: Participant est un ObjectId (string ou Types.ObjectId)
      if (typeof participant === 'string' || participant instanceof Types.ObjectId) {
        return participant.toString() === userId;
      }
      
      // Cas 2: Participant est un objet peuplé avec _id
      if (participant && typeof participant === 'object') {
        // Essayer _id d'abord (format Mongoose peuplé)
        if (participant._id) {
          return participant._id.toString() === userId;
        }
        // Essayer id comme fallback
        if (participant.id) {
          return participant.id.toString() === userId;
        }
        // Si c'est un ObjectId direct (sans _id)
        if (participant.toString) {
          return participant.toString() === userId;
        }
      }
      
      return false;
    });
  }

  /**
   * Create a new chat (1-on-1 or group)
   */
  async create(createChatDto: CreateChatDto, userId: string): Promise<ChatDocument> {
    this.validateObjectId(userId, 'User ID');
    
    // Validate all participant IDs
    createChatDto.participantIds.forEach((id) => {
      this.validateObjectId(id, 'Participant ID');
    });
    
    const participantIds = [
      ...new Set([userId, ...createChatDto.participantIds]),
    ].map((id) => new Types.ObjectId(id));

    // Check if it's a group chat
    const isGroup = participantIds.length > 2;

    if (isGroup && !createChatDto.groupName) {
      throw new BadRequestException('Group name is required for group chats');
    }

    // Check if 1-on-1 chat already exists
    if (!isGroup) {
      const existingChat = await this.chatModel.findOne({
        participants: { $all: participantIds, $size: participantIds.length },
        isGroup: false,
      });

      if (existingChat) {
        return existingChat;
      }
    }

    const chatData: any = {
      participants: participantIds,
      isGroup,
      unreadCounts: new Map(),
      lastReadAt: new Map(),
    };

    if (isGroup) {
      chatData.groupName = createChatDto.groupName;
      if (createChatDto.groupAvatar) {
        chatData.groupAvatar = createChatDto.groupAvatar;
      }
    }

    const chat = new this.chatModel(chatData);
    return chat.save();
  }

  /**
   * Get all chats for a user with populated data
   */
  async findAll(userId: string, searchQuery?: string): Promise<any[]> {
    this.validateObjectId(userId, 'User ID');
    
    const userObjectId = new Types.ObjectId(userId);

    const chats = await this.chatModel
      .find({ participants: userObjectId })
      .populate('participants', 'name email profileImageUrl')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .exec();

    // Transform to match iOS ViewModel structure
    const transformedChats = await Promise.all(
      chats.map(async (chat) => {
        const otherParticipants = chat.participants.filter(
          (p: any) => p._id.toString() !== userId,
        );

        // Get participant names
        const participantNames = chat.isGroup
          ? chat.groupName || 'Group Chat'
          : otherParticipants.map((p: any) => p.name).join(', ');

        // Get participant avatars
        const participantAvatars = otherParticipants
          .map((p: any) => p.profileImageUrl)
          .filter(Boolean);

        // Get last message
        let lastMessage = '';
        let lastMessageTime = '';
        if (chat.lastMessage) {
          const lastMsg = await this.messageModel
            .findById(chat.lastMessage)
            .populate('sender', 'name')
            .exec();
          if (lastMsg) {
            lastMessage = lastMsg.text;
            lastMessageTime = this.formatMessageTime(lastMsg.createdAt);
          }
        }

        // Get unread count for this user
        const unreadCount = chat.unreadCounts?.get(userId) || 0;

        return {
          id: chat._id.toString(),
          participantNames,
          participantAvatars,
          lastMessage,
          lastMessageTime,
          unreadCount,
          isGroup: chat.isGroup,
          chat, // Include full chat object for reference
        };
      }),
    );

    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return transformedChats.filter(
        (chat) =>
          chat.participantNames.toLowerCase().includes(query) ||
          chat.lastMessage.toLowerCase().includes(query),
      );
    }

    return transformedChats;
  }

  /**
   * Get a specific chat by ID
   */
  async findOne(chatId: string, userId: string): Promise<ChatDocument> {
    this.validateObjectId(chatId, 'Chat ID');
    this.validateObjectId(userId, 'User ID');

    const chat = await this.chatModel
      .findById(chatId)
      .populate('participants', 'name email profileImageUrl')
      .populate('lastMessage')
      .exec();

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Vérifier que les participants sont bien peuplés
    if (chat.participants && chat.participants.length > 0) {
      const firstParticipant = chat.participants[0] as any;
      // Si le premier participant n'est pas peuplé, repeupler
      if (!firstParticipant || (!firstParticipant._id && typeof firstParticipant !== 'string')) {
        await chat.populate('participants', 'name email profileImageUrl');
      }
    }

    // Check if user is a participant (gère les deux formats)
    if (!this.isUserParticipantInChat(chat.participants, userId)) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    return chat;
  }

  /**
   * Get all messages for a chat
   */
  async getMessages(chatId: string, userId: string): Promise<any[]> {
    this.validateObjectId(chatId, 'Chat ID');
    this.validateObjectId(userId, 'User ID');
    
    // Verify user has access to chat
    await this.findOne(chatId, userId);

    const messages = await this.messageModel
      .find({ chat: new Types.ObjectId(chatId), isDeleted: false })
      .populate('sender', 'name email profileImageUrl')
      .sort({ createdAt: 1 })
      .exec();

    // Transform to match iOS ViewModel structure
    return messages.map((message) => {
      const isMe = message.sender._id.toString() === userId;
      const sender = message.sender as any;

      return {
        id: message._id.toString(),
        text: message.text,
        sender: isMe ? 'me' : 'other',
        time: this.formatMessageTime(message.createdAt),
        senderName: isMe ? null : sender.name,
        avatar: isMe ? null : sender.profileImageUrl,
        createdAt: message.createdAt,
      };
    });
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(
    chatId: string,
    sendMessageDto: SendMessageDto,
    userId: string,
  ): Promise<MessageDocument> {
    this.validateObjectId(chatId, 'Chat ID');
    this.validateObjectId(userId, 'User ID');
    
    // Verify user has access to chat
    const chat = await this.findOne(chatId, userId);

    const message = new this.messageModel({
      chat: new Types.ObjectId(chatId),
      sender: new Types.ObjectId(userId),
      text: sendMessageDto.text,
      readBy: [new Types.ObjectId(userId)], // Sender has read their own message
    });

    const savedMessage = await message.save();

    // Update chat's last message
    chat.lastMessage = savedMessage._id;

    // Increment unread counts for all participants except sender
    chat.participants.forEach((participant: any) => {
      const participantId = participant._id.toString();
      if (participantId !== userId) {
        const currentCount = chat.unreadCounts?.get(participantId) || 0;
        chat.unreadCounts?.set(participantId, currentCount + 1);
      }
    });

    await chat.save();

    const populatedMessage = await savedMessage.populate(
      'sender',
      'name email profileImageUrl',
    );

    // Diffuser le message via WebSocket pour les clients connectés
    try {
      const sender = populatedMessage.sender as any;
      this.chatsGateway.broadcastNewMessage(chatId, {
        _id: populatedMessage._id,
        id: populatedMessage._id.toString(),
        text: populatedMessage.text,
        content: populatedMessage.text,
        createdAt: populatedMessage.createdAt,
        sender: {
          _id: sender._id?.toString() || sender.toString(),
          id: sender._id?.toString() || sender.toString(),
          name: sender.name,
          email: sender.email,
          profileImageUrl: sender.profileImageUrl,
          avatar: sender.profileImageUrl,
        },
      });
      this.logger.log(`Message broadcasted via WebSocket for chat ${chatId}`);
    } catch (error) {
      // Ne pas bloquer l'envoi du message si la diffusion WebSocket échoue
      this.logger.warn(
        `Failed to broadcast message via WebSocket: ${error.message}`,
      );
    }

    return populatedMessage;
  }

  /**
   * Mark chat as read (reset unread count)
   */
  async markChatAsRead(chatId: string, userId: string): Promise<ChatDocument> {
    this.validateObjectId(chatId, 'Chat ID');
    this.validateObjectId(userId, 'User ID');
    
    const chat = await this.findOne(chatId, userId);

    // Reset unread count
    chat.unreadCounts?.set(userId, 0);
    chat.lastReadAt?.set(userId, new Date());

    // Mark all messages as read
    await this.messageModel.updateMany(
      {
        chat: new Types.ObjectId(chatId),
        sender: { $ne: new Types.ObjectId(userId) },
        readBy: { $ne: new Types.ObjectId(userId) },
      },
      { $addToSet: { readBy: new Types.ObjectId(userId) } },
    );

    return chat.save();
  }

  /**
   * Delete a chat
   */
  async remove(chatId: string, userId: string): Promise<void> {
    this.validateObjectId(chatId, 'Chat ID');
    this.validateObjectId(userId, 'User ID');
    
    const chat = await this.findOne(chatId, userId);

    // For group chats, only allow deletion by participants (could add admin check later)
    // For 1-on-1 chats, allow deletion by any participant
    await this.chatModel.findByIdAndDelete(chatId).exec();
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    this.validateObjectId(messageId, 'Message ID');
    this.validateObjectId(userId, 'User ID');
    
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Check if user is the sender
    if (message.sender.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.isDeleted = true;
    await message.save();
  }

  /**
   * Format message time for display
   */
  private formatMessageTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;

    // Format as date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Find a group chat by activity ID
   */
  async findGroupChatByActivityId(activityId: string): Promise<ChatDocument | null> {
    this.validateObjectId(activityId, 'Activity ID');
    
    const chat = await this.chatModel
      .findOne({
        activityId: new Types.ObjectId(activityId),
        isGroup: true,
      })
      .populate('participants', 'name email profileImageUrl')
      .exec();
    
    // S'assurer que les participants sont bien peuplés
    if (chat && chat.participants && chat.participants.length > 0) {
      const firstParticipant = chat.participants[0] as any;
      // Si le premier participant n'est pas peuplé (pas de _id ou pas de name), peupler à nouveau
      if (!firstParticipant || !firstParticipant._id || firstParticipant.name === undefined) {
        await chat.populate('participants', 'name email profileImageUrl');
      }
    }
    
    return chat;
  }

  /**
   * Create a group chat with participants
   */
  async createGroupChat(data: {
    participantIds: string[];
    groupName: string;
    groupAvatar?: string;
    activityId?: string;
  }): Promise<ChatDocument> {
    // Filtrer les IDs null/undefined/vides
    const validParticipantIds = data.participantIds.filter(
      (id) => id && typeof id === 'string' && id.trim().length > 0,
    );

    if (validParticipantIds.length === 0) {
      throw new BadRequestException('At least one participant is required.');
    }

    // Éliminer les doublons
    const uniqueParticipantIds = Array.from(new Set(validParticipantIds));

    // Validate all participant IDs
    uniqueParticipantIds.forEach((id) => {
      this.validateObjectId(id, 'Participant ID');
    });

    if (data.activityId) {
      this.validateObjectId(data.activityId, 'Activity ID');
    }

    // Verify all participants exist
    const participants = await this.userModel.find({
      _id: { $in: uniqueParticipantIds.map(id => new Types.ObjectId(id)) },
    }).exec();

    if (participants.length !== uniqueParticipantIds.length) {
      const foundIds = participants.map(p => p._id.toString());
      const missingIds = uniqueParticipantIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(
        `Some participants not found: ${missingIds.join(', ')}`
      );
    }

    // Normaliser les participants : toujours stocker comme ObjectIds (pas comme objets)
    const participantObjectIds = participants.map((p) => {
      // S'assurer que c'est un ObjectId, pas un objet
      if (p._id instanceof Types.ObjectId) {
        return p._id;
      }
      return new Types.ObjectId(p._id.toString());
    });

    const chatData: any = {
      participants: participantObjectIds, // Toujours stocker comme ObjectIds
      isGroup: true,
      groupName: data.groupName,
      unreadCounts: new Map(),
      lastReadAt: new Map(),
    };

    if (data.groupAvatar) {
      chatData.groupAvatar = data.groupAvatar;
    }

    if (data.activityId) {
      chatData.activityId = new Types.ObjectId(data.activityId);
    }

    const chat = new this.chatModel(chatData);
    await chat.save();
    
    // Peupler les participants avant de retourner
    const populatedChat = await chat.populate('participants', 'name email profileImageUrl');
    
    // Vérifier que le peuplement a fonctionné
    if (populatedChat.participants && populatedChat.participants.length > 0) {
      const firstParticipant = populatedChat.participants[0] as any;
      if (!firstParticipant || !firstParticipant._id || firstParticipant.name === undefined) {
        // Si le peuplement n'a pas fonctionné, réessayer
        await populatedChat.populate('participants', 'name email profileImageUrl');
      }
    }
    
    return populatedChat;
  }

  /**
   * Quitter un groupe de chat
   */
  async leaveGroup(chatId: string, userId: string): Promise<void> {
    this.validateObjectId(chatId, 'Chat ID');
    this.validateObjectId(userId, 'User ID');

    // 1. Récupérer le chat
    const chat = await this.chatModel.findById(chatId).exec();
    
    if (!chat) {
      throw new NotFoundException('Chat not found.');
    }

    // 2. Vérifier que c'est un groupe (pas un chat direct)
    if (!chat.isGroup) {
      throw new BadRequestException('Cannot leave a direct chat. This endpoint is only for group chats.');
    }

    // 3. Peupler les participants si nécessaire
    if (chat.participants && chat.participants.length > 0) {
      const firstParticipant = chat.participants[0] as any;
      if (!firstParticipant || (!firstParticipant._id && typeof firstParticipant !== 'string')) {
        await chat.populate('participants', 'name email profileImageUrl');
      }
    }

    // 4. Vérifier que l'utilisateur est participant (gère les deux formats)
    if (!this.isUserParticipantInChat(chat.participants, userId)) {
      throw new ForbiddenException('You are not a participant of this chat.');
    }

    // 5. Retirer l'utilisateur de la liste des participants
    chat.participants = chat.participants.filter(
      (p: any) => {
        const participantId = typeof p === 'string' 
          ? p 
          : (p._id ? p._id.toString() : p.toString());
        return participantId !== userId;
      }
    ) as Types.ObjectId[];

    // 6. Si le groupe devient vide, supprimer le chat
    if (chat.participants.length === 0) {
      await chat.deleteOne();
    } else {
      // Retirer aussi de unreadCounts et lastReadAt si présents
      if (chat.unreadCounts) {
        chat.unreadCounts.delete(userId);
      }
      if (chat.lastReadAt) {
        chat.lastReadAt.delete(userId);
      }
      // Sauvegarder les modifications
      await chat.save();
    }
  }

  /**
   * Récupérer les participants d'un chat
   */
  async getParticipants(chatId: string, userId: string): Promise<UserDocument[]> {
    this.validateObjectId(chatId, 'Chat ID');
    this.validateObjectId(userId, 'User ID');

    // 1. Récupérer le chat avec les participants peuplés
    const chat = await this.chatModel
      .findById(chatId)
      .populate('participants', 'name email profileImageUrl')
      .exec();
    
    if (!chat) {
      throw new NotFoundException('Chat not found.');
    }

    // 2. Vérifier que les participants sont peuplés
    if (chat.participants && chat.participants.length > 0) {
      const firstParticipant = chat.participants[0] as any;
      if (!firstParticipant || (!firstParticipant._id && typeof firstParticipant !== 'string')) {
        await chat.populate('participants', 'name email profileImageUrl');
      }
    }

    // 3. Vérifier que l'utilisateur est participant (gère les deux formats)
    if (!this.isUserParticipantInChat(chat.participants, userId)) {
      throw new ForbiddenException('You are not a participant of this chat.');
    }

    // 4. Filtrer les participants null/undefined et vérifier s'ils sont peuplés
    const validParticipants = chat.participants.filter(p => p != null);
    
    // Vérifier si les participants sont déjà peuplés (ont _id et name)
    // Un participant peuplé aura une propriété 'name' (car on a fait populate avec 'name email profileImageUrl')
    const firstParticipant = validParticipants[0] as any;
    const isPopulated = firstParticipant && firstParticipant._id && firstParticipant.name !== undefined;
    
    if (isPopulated) {
      // Les participants sont déjà peuplés, les filtrer pour s'assurer qu'ils sont valides
      const populatedParticipants = validParticipants.filter((p: any) => 
        p && p._id && p.name !== undefined
      );
      
      // Cast via unknown pour éviter l'erreur TypeScript
      // On sait que ces participants sont peuplés car on a vérifié qu'ils ont _id et name
      return populatedParticipants as unknown as UserDocument[];
    }

    // Sinon, peupler les participants manuellement
    const participantIds = validParticipants.map(p => {
      if (typeof p === 'string') {
        return p;
      }
      const participant = p as any;
      return participant._id ? participant._id.toString() : p.toString();
    });
    
    const participants = await this.userModel.find({
      _id: { $in: participantIds.map(id => new Types.ObjectId(id)) }
    }).exec();

    return participants;
  }
}

