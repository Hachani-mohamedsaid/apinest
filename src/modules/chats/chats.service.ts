import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p: any) => p._id.toString() === userId,
    );

    if (!isParticipant) {
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

    return savedMessage.populate('sender', 'name email profileImageUrl');
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
    
    return this.chatModel
      .findOne({
        activityId: new Types.ObjectId(activityId),
        isGroup: true,
      })
      .populate('participants', 'name email profileImageUrl')
      .exec();
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
    // Validate all participant IDs
    data.participantIds.forEach((id) => {
      this.validateObjectId(id, 'Participant ID');
    });

    if (data.activityId) {
      this.validateObjectId(data.activityId, 'Activity ID');
    }

    // Verify all participants exist
    const participants = await this.userModel.find({
      _id: { $in: data.participantIds.map(id => new Types.ObjectId(id)) },
    });

    if (participants.length !== data.participantIds.length) {
      throw new BadRequestException('Some participants not found');
    }

    const participantObjectIds = participants.map((p) => p._id);

    const chatData: any = {
      participants: participantObjectIds,
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
    
    return chat.populate('participants', 'name email profileImageUrl');
  }
}

