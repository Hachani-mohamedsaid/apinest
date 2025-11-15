import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatParticipantDto } from './dto/chat-participant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('chats')
@Controller('chats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat (1-on-1 or group)' })
  @ApiResponse({ status: 201, description: 'Chat created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createChatDto: CreateChatDto, @Request() req) {
    const userId = req.user._id.toString();
    return this.chatsService.create(createChatDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all chats for the current user' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search query to filter chats',
  })
  @ApiResponse({ status: 200, description: 'List of chats retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query('search') searchQuery?: string, @Request() req?: any) {
    const userId = req.user._id.toString();
    return this.chatsService.findAll(userId, searchQuery);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get all participants of a chat' })
  @ApiResponse({ 
    status: 200, 
    description: 'Participants retrieved successfully',
    type: [ChatParticipantDto]
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getParticipants(
    @Param('id') chatId: string,
    @Request() req,
  ): Promise<ChatParticipantDto[]> {
    const userId = req.user._id.toString();
    
    const participants = await this.chatsService.getParticipants(chatId, userId);
    
    return participants.map((p: any) => ({
      id: p._id.toString(),
      name: p.name || 'Unknown',
      email: p.email || undefined,
      profileImageUrl: p.profileImageUrl || undefined,
      avatar: p.profileImageUrl || p.avatar || undefined,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific chat by ID' })
  @ApiResponse({ status: 200, description: 'Chat retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    return this.chatsService.findOne(id, userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages for a chat' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMessages(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    return this.chatsService.getMessages(id, userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message to a chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid message data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req,
  ) {
    const userId = req.user._id.toString();
    return this.chatsService.sendMessage(id, sendMessageDto, userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a chat as read (reset unread count)' })
  @ApiResponse({ status: 200, description: 'Chat marked as read' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    return this.chatsService.markChatAsRead(id, userId);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a group chat' })
  @ApiResponse({ status: 200, description: 'Successfully left the group' })
  @ApiResponse({ status: 400, description: 'Cannot leave a direct chat' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async leaveGroup(
    @Param('id') chatId: string,
    @Request() req,
  ) {
    const userId = req.user._id.toString();
    
    await this.chatsService.leaveGroup(chatId, userId);
    
    return {
      message: 'Successfully left the group',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a chat' })
  @ApiResponse({ status: 200, description: 'Chat deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    await this.chatsService.remove(id, userId);
    return { message: 'Chat deleted successfully' };
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message (soft delete)' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not the sender' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    const userId = req.user._id.toString();
    await this.chatsService.deleteMessage(messageId, userId);
    return { message: 'Message deleted successfully' };
  }
}

