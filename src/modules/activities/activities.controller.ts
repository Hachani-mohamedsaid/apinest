import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { ActivityMessagesService } from './activity-messages.service';
import { ChatsService } from '../chats/chats.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ActivityGroupChatResponseDto } from './dto/activity-group-chat-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly activityMessagesService: ActivityMessagesService,
    private readonly chatsService: ChatsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new activity' })
  @ApiResponse({ status: 201, description: 'Activity created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
    const userId = req.user._id.toString();
    return this.activitiesService.create(createActivityDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all public activities' })
  @ApiQuery({
    name: 'visibility',
    required: false,
    enum: ['public', 'friends'],
    description: 'Filter by visibility (requires auth for friends)',
  })
  @ApiResponse({ status: 200, description: 'List of activities retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Authentication required for friends visibility' })
  async findAll(@Query('visibility') visibility?: string, @Request() req?: any) {
    const userId = req?.user?._id?.toString() || undefined;
    return this.activitiesService.findAll(visibility, userId);
  }

  @Get('my-activities')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all activities created by the current user' })
  @ApiResponse({ status: 200, description: 'User activities retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyActivities(@Request() req) {
    const userId = req.user._id.toString();
    return this.activitiesService.findMyActivities(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific activity by ID' })
  @ApiResponse({ status: 200, description: 'Activity retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an activity (only by creator)' })
  @ApiResponse({ status: 200, description: 'Activity updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only creator can update' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @Request() req,
  ) {
    const userId = req.user._id.toString();
    return this.activitiesService.update(id, updateActivityDto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an activity (only by creator)' })
  @ApiResponse({ status: 200, description: 'Activity deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only creator can delete' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    await this.activitiesService.remove(id, userId);
    return { message: 'Activity deleted successfully' };
  }

  // Activity Room endpoints
  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join an activity' })
  @ApiResponse({ status: 200, description: 'Successfully joined activity' })
  @ApiResponse({ status: 400, description: 'Already joined or activity is full' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async joinActivity(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    return this.activitiesService.joinActivity(id, userId);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all messages for an activity' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMessages(@Param('id') id: string) {
    return this.activityMessagesService.getMessages(id);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message in an activity chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 403, description: 'Must join activity to send messages' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req,
  ) {
    const userId = req.user._id.toString();
    return this.activityMessagesService.sendMessage(id, userId, sendMessageDto.content);
  }

  @Get(':id/participants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all participants of an activity' })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getParticipants(@Param('id') id: string) {
    return this.activitiesService.getParticipantsDetails(id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave an activity' })
  @ApiResponse({ status: 200, description: 'Successfully left activity' })
  @ApiResponse({ status: 400, description: 'Host cannot leave or not a participant' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async leaveActivity(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    return this.activitiesService.leaveActivity(id, userId);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark an activity as complete (only by creator)' })
  @ApiResponse({ status: 200, description: 'Activity marked as complete' })
  @ApiResponse({ status: 403, description: 'Only host can mark as complete' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeActivity(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    return this.activitiesService.completeActivity(id, userId);
  }

  @Post(':activityId/group-chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or get group chat for an activity' })
  @ApiResponse({
    status: 200,
    description: 'Group chat created or existing chat returned',
    type: ActivityGroupChatResponseDto,
  })
  @ApiResponse({ status: 201, description: 'New group chat created' })
  @ApiResponse({ status: 400, description: 'Invalid activity or no participants' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not a participant of the activity' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async createOrGetActivityGroupChat(
    @Param('activityId') activityId: string,
    @Request() req,
  ): Promise<ActivityGroupChatResponseDto> {
    const userId = req.user._id.toString();

    // 1. Vérifier que l'activité existe
    const activity = await this.activitiesService.findOne(activityId);
    if (!activity) {
      throw new NotFoundException('Activité non trouvée');
    }

    // 2. Vérifier que l'utilisateur est participant de l'activité
    const isParticipant = await this.activitiesService.isUserParticipant(
      activityId,
      userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'Vous devez être participant de l\'activité pour accéder au chat de groupe',
      );
    }

    // 3. Vérifier si un chat de groupe existe déjà pour cette activité
    const existingChat = await this.chatsService.findGroupChatByActivityId(
      activityId,
    );

    if (existingChat) {
      // Retourner le chat existant
      const validChatParticipants = (existingChat.participants || [])
        .filter((p: any) => p != null && p._id)
        .map((p: any) => ({
          id: p._id.toString(),
          name: p.name || 'Unknown',
          profileImageUrl: p.profileImageUrl || null,
        }));

      return {
        chat: {
          id: existingChat._id.toString(),
          groupName: existingChat.groupName || (activity as any).title,
          groupAvatar: existingChat.groupAvatar,
          participants: validChatParticipants,
          isGroup: true,
          createdAt: (existingChat as any).createdAt.toISOString(),
          updatedAt: (existingChat as any).updatedAt.toISOString(),
        },
        message: 'Chat de groupe existant',
      };
    }

    // 4. Récupérer tous les participants de l'activité
    const participants = await this.activitiesService.getActivityParticipants(
      activityId,
    );

    if (participants.length === 0) {
      throw new BadRequestException(
        'Aucun participant trouvé pour cette activité',
      );
    }

    // 5. Créer le chat de groupe avec tous les participants
    // getActivityParticipants retourne des objets avec { id, name, profileImageUrl }
    const participantIds = participants.map((p: any) => p.id);

    const newChat = await this.chatsService.createGroupChat({
      participantIds,
      groupName: (activity as any).title || `Groupe ${(activity as any).sportType}`,
      groupAvatar: null, // Optionnel : utiliser une image par défaut selon le sport
      activityId: activityId, // Lier le chat à l'activité
    });

    const validNewChatParticipants = (newChat.participants || [])
      .filter((p: any) => p != null && p._id)
      .map((p: any) => ({
        id: p._id.toString(),
        name: p.name || 'Unknown',
        profileImageUrl: p.profileImageUrl || null,
      }));

    return {
      chat: {
        id: newChat._id.toString(),
        groupName: newChat.groupName,
        groupAvatar: newChat.groupAvatar,
        participants: validNewChatParticipants,
        isGroup: true,
        createdAt: (newChat as any).createdAt.toISOString(),
        updatedAt: (newChat as any).updatedAt.toISOString(),
      },
      message: 'Chat de groupe créé avec succès',
    };
  }
}

