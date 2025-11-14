import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto, SuggestedActivityDto, SuggestedUserDto } from './dto/chat-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';

@Injectable()
export class AIMatchmakerService {
  private readonly openaiApiKey: string;
  private readonly openaiModel: string;
  private readonly openaiApiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    // Modèle par défaut: gpt-3.5-turbo (accessible pour tous)
    // Alternatives: gpt-4o, gpt-4-turbo, gpt-4o-mini
    this.openaiModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo';
  }

  async chat(userId: string, chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      // Récupérer les données de l'application pour le contexte
      const user = await this.userModel.findById(userId).exec();
      const activities = await this.activityModel
        .find({ visibility: 'public' })
        .limit(20)
        .populate('creator', 'name email profileImageUrl')
        .exec();
      
      const users = await this.userModel
        .find({ _id: { $ne: userId } })
        .limit(20)
        .select('name email location sportsInterests profileImageUrl about')
        .exec();

      // Construire le contexte pour l'IA
      const context = this.buildContext(user, activities, users);

      // Préparer les messages pour ChatGPT
      const messages = this.prepareMessages(chatRequest, context);

      // Appeler l'API ChatGPT
      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: this.openaiModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponse = response.data.choices[0].message.content;

      // Parser la réponse de l'IA pour extraire les suggestions
      const parsedResponse = this.parseAIResponse(aiResponse, activities, users);

      return parsedResponse;
    } catch (error) {
      console.error('Error in AI Matchmaker chat:', error);
      if (error.response) {
        throw new HttpException(
          `OpenAI API Error: ${error.response.data?.error?.message || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Erreur lors de la communication avec l\'IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private buildContext(user: any, activities: any[], users: any[]): string {
    let context = `Tu es un assistant AI matchmaker pour une application de sport. `;
    context += `Tu aides les utilisateurs à trouver des partenaires de sport et des activités. `;
    context += `L'utilisateur actuel est: ${user?.name || 'Utilisateur'} (${user?.location || 'Localisation inconnue'}). `;
    
    if (user?.sportsInterests && user.sportsInterests.length > 0) {
      context += `Ses sports préférés sont: ${user.sportsInterests.join(', ')}. `;
    }

    context += `\n\nVoici les activités disponibles dans l'application:\n`;
    activities.forEach((activity, index) => {
      const dateStr = activity.date instanceof Date 
        ? activity.date.toLocaleDateString('fr-FR') 
        : activity.date;
      const timeStr = activity.time instanceof Date 
        ? activity.time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : activity.time;
      
      context += `${index + 1}. ${activity.title} (${activity.sportType}) - ${activity.location} - ${dateStr} ${timeStr} - Niveau: ${activity.level} - Participants: ${activity.participants}\n`;
    });

    context += `\n\nVoici les utilisateurs disponibles:\n`;
    users.forEach((u, index) => {
      context += `${index + 1}. ${u.name} - ${u.location || 'Localisation inconnue'} - Sports: ${u.sportsInterests?.join(', ') || 'Non spécifiés'}\n`;
    });

    context += `\n\nQuand l'utilisateur demande des activités ou des partenaires, suggère des activités et utilisateurs de la liste ci-dessus qui correspondent à sa demande. `;
    context += `Réponds en français de manière amicale et utile. `;
    context += `Si tu suggères des activités, utilise les IDs réels des activités. `;
    context += `Si tu suggères des utilisateurs, utilise les IDs réels des utilisateurs.`;

    return context;
  }

  private prepareMessages(chatRequest: ChatRequestDto, context: string): any[] {
    const messages: any[] = [
      {
        role: 'system',
        content: context,
      },
    ];

    // Ajouter l'historique de conversation
    if (chatRequest.conversationHistory && chatRequest.conversationHistory.length > 0) {
      chatRequest.conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Ajouter le message actuel
    messages.push({
      role: 'user',
      content: chatRequest.message,
    });

    return messages;
  }

  private parseAIResponse(
    aiResponse: string,
    activities: any[],
    users: any[],
  ): ChatResponseDto {
    // Extraire les suggestions d'activités et d'utilisateurs de la réponse
    const suggestedActivities: SuggestedActivityDto[] = [];
    const suggestedUsers: SuggestedUserDto[] = [];
    const options: string[] = [];

    // Chercher des références aux activités dans la réponse
    activities.forEach(activity => {
      if (aiResponse.toLowerCase().includes(activity.title.toLowerCase()) ||
          aiResponse.toLowerCase().includes(activity.sportType.toLowerCase())) {
        const dateStr = activity.date instanceof Date 
          ? activity.date.toLocaleDateString('fr-FR') 
          : String(activity.date);
        const timeStr = activity.time instanceof Date 
          ? activity.time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : String(activity.time);

        suggestedActivities.push({
          id: activity._id.toString(),
          title: activity.title,
          sportType: activity.sportType,
          location: activity.location,
          date: dateStr,
          time: timeStr,
          participants: activity.participants || 0,
          maxParticipants: 10, // Default max participants since schema doesn't have separate field
          level: activity.level,
          matchScore: 85 + Math.floor(Math.random() * 15), // Score entre 85 et 100
        });
      }
    });

    // Chercher des références aux utilisateurs dans la réponse
    users.forEach(user => {
      if (aiResponse.toLowerCase().includes(user.name.toLowerCase())) {
        suggestedUsers.push({
          id: user._id.toString(),
          name: user.name,
          profileImageUrl: user.profileImageUrl,
          sport: user.sportsInterests?.[0] || 'Sport',
          distance: 'Proche',
          matchScore: 80 + Math.floor(Math.random() * 20),
          bio: user.about,
          availability: 'Disponible',
        });
      }
    });

    // Extraire les options de la réponse (si l'IA suggère des actions)
    if (aiResponse.includes('?')) {
      const sentences = aiResponse.split(/[.!?]/);
      sentences.forEach(sentence => {
        if (sentence.trim().length > 10 && sentence.trim().length < 50) {
          options.push(sentence.trim());
        }
      });
      // Limiter à 3 options
      options.splice(3);
    }

    return {
      message: aiResponse,
      suggestedActivities: suggestedActivities.length > 0 ? suggestedActivities : undefined,
      suggestedUsers: suggestedUsers.length > 0 ? suggestedUsers : undefined,
      options: options.length > 0 ? options : undefined,
    };
  }
}

