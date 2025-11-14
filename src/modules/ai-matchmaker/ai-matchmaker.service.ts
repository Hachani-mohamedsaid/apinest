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

      // Appeler l'API ChatGPT avec retry en cas d'erreur 429
      const aiResponse = await this.callOpenAIWithRetry(messages);

      // Parser la réponse de l'IA pour extraire les suggestions
      const parsedResponse = this.parseAIResponse(aiResponse, activities, users);

      return parsedResponse;
    } catch (error) {
      console.error('Error in AI Matchmaker chat:', error);
      
      // Si erreur 429, utiliser un fallback intelligent basé sur les données disponibles
      if (error.response?.status === 429 || error.statusCode === 429) {
        console.warn('OpenAI API quota exceeded, using fallback response');
        try {
          // Récupérer les données pour le fallback
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

          return this.generateFallbackResponse(chatRequest, activities, users);
        } catch (fallbackError) {
          console.error('Error generating fallback response:', fallbackError);
        }
      }
      
      if (error.response) {
        const statusCode = error.response.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.response.data?.error?.message || error.message;
        
        throw new HttpException(
          {
            statusCode: statusCode,
            message: `OpenAI API Error: ${errorMessage}`,
          },
          statusCode,
        );
      }
      
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erreur lors de la communication avec l\'IA',
        },
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
      const activityId = activity._id.toString();
      const dateStr = activity.date instanceof Date 
        ? activity.date.toLocaleDateString('fr-FR') 
        : String(activity.date);
      const timeStr = activity.time instanceof Date 
        ? activity.time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : String(activity.time);
      
      context += `${index + 1}. ID: ${activityId} - ${activity.title} (${activity.sportType}) - ${activity.location} - ${dateStr} ${timeStr} - Niveau: ${activity.level} - Participants: ${activity.participants}/${activity.participants || 10}\n`;
    });

    context += `\n\nVoici les utilisateurs disponibles:\n`;
    users.forEach((u, index) => {
      const userId = u._id.toString();
      context += `${index + 1}. ID: ${userId} - ${u.name} - ${u.location || 'Localisation inconnue'} - Sports: ${u.sportsInterests?.join(', ') || 'Non spécifiés'}\n`;
    });

    context += `\n\nIMPORTANT - Instructions pour les réponses:\n`;
    context += `1. Réponds en français de manière amicale et utile.\n`;
    context += `2. Quand tu suggères des activités, mentionne explicitement le titre de l'activité ET son ID dans ta réponse.\n`;
    context += `3. Quand tu suggères des utilisateurs, mentionne explicitement le nom de l'utilisateur ET son ID dans ta réponse.\n`;
    context += `4. Si l'utilisateur demande "trouver un partenaire de course", suggère des utilisateurs qui aiment la course à pied.\n`;
    context += `5. Si l'utilisateur demande des activités de groupe, suggère des activités avec plusieurs participants.\n`;
    context += `6. Sois spécifique et mentionne les détails (lieu, date, niveau) des activités suggérées.\n`;

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

    // Chercher des références aux activités dans la réponse par ID ou titre
    activities.forEach(activity => {
      const activityId = activity._id.toString();
      const titleLower = activity.title.toLowerCase();
      const sportTypeLower = activity.sportType.toLowerCase();
      const responseLower = aiResponse.toLowerCase();
      
      // Vérifier si l'ID ou le titre est mentionné dans la réponse
      if (aiResponse.includes(activityId) || 
          responseLower.includes(titleLower) ||
          (responseLower.includes(sportTypeLower) && responseLower.includes(activity.location.toLowerCase()))) {
        // Éviter les doublons
        if (!suggestedActivities.find(a => a.id === activityId)) {
          const dateStr = activity.date instanceof Date 
            ? activity.date.toLocaleDateString('fr-FR') 
            : String(activity.date);
          const timeStr = activity.time instanceof Date 
            ? activity.time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : String(activity.time);

          suggestedActivities.push({
            id: activityId,
            title: activity.title,
            sportType: activity.sportType,
            location: activity.location,
            date: dateStr,
            time: timeStr,
            participants: activity.participants || 0,
            maxParticipants: activity.participants || 10,
            level: activity.level,
            matchScore: 85 + Math.floor(Math.random() * 15), // Score entre 85 et 100
          });
        }
      }
    });

    // Chercher des références aux utilisateurs dans la réponse par ID ou nom
    users.forEach(user => {
      const userId = user._id.toString();
      const nameLower = user.name.toLowerCase();
      const responseLower = aiResponse.toLowerCase();
      
      // Vérifier si l'ID ou le nom est mentionné dans la réponse
      if (aiResponse.includes(userId) || 
          responseLower.includes(nameLower)) {
        // Éviter les doublons
        if (!suggestedUsers.find(u => u.id === userId)) {
          suggestedUsers.push({
            id: userId,
            name: user.name,
            profileImageUrl: user.profileImageUrl,
            sport: user.sportsInterests?.[0] || 'Sport',
            distance: 'Proche',
            matchScore: 80 + Math.floor(Math.random() * 20),
            bio: user.about,
            availability: 'Disponible',
          });
        }
      }
    });

    // Si aucune suggestion n'a été trouvée mais que l'utilisateur demande des activités/partenaires,
    // suggérer les meilleures correspondances basées sur les sports préférés
    if (suggestedActivities.length === 0 && suggestedUsers.length === 0) {
      const responseLower = aiResponse.toLowerCase();
      
      // Si la demande concerne des activités
      if (responseLower.includes('activité') || responseLower.includes('activite') || 
          responseLower.includes('groupe') || responseLower.includes('rejoindre')) {
        // Prendre les 3 premières activités disponibles
        activities.slice(0, 3).forEach(activity => {
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
            maxParticipants: activity.participants || 10,
            level: activity.level,
            matchScore: 80 + Math.floor(Math.random() * 15),
          });
        });
      }
      
      // Si la demande concerne des partenaires
      if (responseLower.includes('partenaire') || responseLower.includes('course') || 
          responseLower.includes('running') || responseLower.includes('coureur')) {
        // Prendre les 3 premiers utilisateurs disponibles
        users.slice(0, 3).forEach(user => {
          suggestedUsers.push({
            id: user._id.toString(),
            name: user.name,
            profileImageUrl: user.profileImageUrl,
            sport: user.sportsInterests?.[0] || 'Sport',
            distance: 'Proche',
            matchScore: 75 + Math.floor(Math.random() * 20),
            bio: user.about,
            availability: 'Disponible',
          });
        });
      }
    }

    // Extraire les options de la réponse (si l'IA suggère des actions)
    if (aiResponse.includes('?')) {
      const sentences = aiResponse.split(/[.!?]/);
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length > 10 && trimmed.length < 50 && !trimmed.includes('ID:')) {
          options.push(trimmed);
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

  private async callOpenAIWithRetry(messages: any[], maxRetries = 2): Promise<string> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
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

        return response.data.choices[0].message.content;
      } catch (error) {
        // Si c'est une erreur 429 et qu'il reste des tentatives, attendre avant de réessayer
        if (error.response?.status === 429 && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Backoff exponentiel: 1s, 2s, 4s
          console.log(`Rate limited, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        // Si c'est la dernière tentative ou une autre erreur, propager l'erreur
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  private generateFallbackResponse(
    chatRequest: ChatRequestDto,
    activities: any[],
    users: any[],
  ): ChatResponseDto {
    const messageLower = chatRequest.message.toLowerCase();
    const suggestedActivities: SuggestedActivityDto[] = [];
    const suggestedUsers: SuggestedUserDto[] = [];
    let message = '';

    // Détecter l'intention de l'utilisateur
    const isLookingForActivities = messageLower.includes('activité') || 
                                   messageLower.includes('activite') || 
                                   messageLower.includes('groupe') || 
                                   messageLower.includes('rejoindre') ||
                                   messageLower.includes('participer');

    const isLookingForPartners = messageLower.includes('partenaire') || 
                                 messageLower.includes('course') || 
                                 messageLower.includes('running') || 
                                 messageLower.includes('coureur') ||
                                 messageLower.includes('trouver');

    // Générer des suggestions basées sur l'intention
    if (isLookingForActivities && activities.length > 0) {
      // Prendre les 3 premières activités disponibles
      activities.slice(0, 3).forEach(activity => {
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
          maxParticipants: activity.participants || 10,
          level: activity.level,
          matchScore: 85 + Math.floor(Math.random() * 15),
        });
      });

      message = `Voici ${suggestedActivities.length} activité${suggestedActivities.length > 1 ? 's' : ''} qui pourraient vous intéresser :`;
    }

    if (isLookingForPartners && users.length > 0) {
      // Prendre les 3 premiers utilisateurs disponibles
      users.slice(0, 3).forEach(user => {
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
      });

      if (!message) {
        message = `Voici ${suggestedUsers.length} partenaire${suggestedUsers.length > 1 ? 's' : ''} qui pourrait${suggestedUsers.length > 1 ? 'ent' : ''} vous intéresser :`;
      }
    }

    // Si aucune intention claire, proposer les deux
    if (!isLookingForActivities && !isLookingForPartners) {
      if (activities.length > 0) {
        activities.slice(0, 2).forEach(activity => {
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
            maxParticipants: activity.participants || 10,
            level: activity.level,
            matchScore: 80 + Math.floor(Math.random() * 15),
          });
        });
      }

      if (users.length > 0) {
        users.slice(0, 2).forEach(user => {
          suggestedUsers.push({
            id: user._id.toString(),
            name: user.name,
            profileImageUrl: user.profileImageUrl,
            sport: user.sportsInterests?.[0] || 'Sport',
            distance: 'Proche',
            matchScore: 75 + Math.floor(Math.random() * 20),
            bio: user.about,
            availability: 'Disponible',
          });
        });
      }

      message = 'Voici quelques suggestions pour vous :';
    }

    // Message par défaut si rien n'a été trouvé
    if (!message) {
      message = 'Je suis désolé, je ne trouve pas de suggestions pour le moment. Veuillez réessayer plus tard.';
    }

    return {
      message,
      suggestedActivities: suggestedActivities.length > 0 ? suggestedActivities : undefined,
      suggestedUsers: suggestedUsers.length > 0 ? suggestedUsers : undefined,
      options: ['Voir toutes les activités', 'Rechercher des partenaires', 'Créer une activité'],
    };
  }
}

