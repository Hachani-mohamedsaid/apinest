import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { AICoachSuggestionsRequestDto } from './dto/suggestions-request.dto';
import { AICoachSuggestionsResponseDto, SuggestedActivityDto } from './dto/suggestions-response.dto';

@Injectable()
export class AICoachService {
  private readonly logger = new Logger(AICoachService.name);
  private readonly geminiApiKey: string;
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private configService: ConfigService,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';

    if (!this.geminiApiKey) {
      this.logger.warn(
        '⚠️ GEMINI_API_KEY not configured. AI Coach suggestions will use fallback mode.',
      );
    } else {
      try {
        this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
        this.logger.log('✅ Google Gemini AI initialized successfully');
      } catch (error) {
        this.logger.error('❌ Error initializing Google Gemini AI:', error);
      }
    }
  }

  async getPersonalizedSuggestions(
    userId: string,
    request: AICoachSuggestionsRequestDto,
  ): Promise<AICoachSuggestionsResponseDto> {
    try {
      // Récupérer les activités disponibles
      const activities = await this.activityModel
        .find({ visibility: 'public' })
        .limit(20)
        .populate('creator', 'name email profileImageUrl')
        .exec();

      if (!this.geminiApiKey || this.geminiApiKey === '' || !this.genAI) {
        // Mode fallback si Gemini n'est pas configuré
        this.logger.warn('Using fallback mode for AI Coach suggestions');
        return this.generateFallbackSuggestions(request, activities);
      }

      // Construire le contexte pour Gemini
      const context = this.buildContext(request, activities);

      // Appeler Gemini API
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `Tu es un coach sportif IA. Basé sur les données de fitness suivantes:

${context}

Propose 3 activités sportives personnalisées qui correspondent au profil de l'utilisateur.

Pour chaque activité, réponds UNIQUEMENT avec ce format JSON (sans texte supplémentaire):

{
  "suggestions": [
    {
      "id": "ID_de_l_activité",
      "title": "Titre de l'activité",
      "sportType": "Type de sport",
      "location": "Lieu",
      "date": "Date",
      "time": "Heure",
      "participants": nombre,
      "maxParticipants": nombre,
      "level": "niveau",
      "matchScore": score_de_0_à_100
    }
  ]
}

IMPORTANT: Utilise uniquement les IDs d'activités qui existent dans la liste fournie.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.debug(`Gemini response: ${text.substring(0, 200)}...`);

      // Parser la réponse JSON de Gemini
      const parsedResponse = this.parseGeminiResponse(text, activities);

      return parsedResponse;
    } catch (error) {
      this.logger.error('Error in AI Coach Gemini:', error);

      // En cas d'erreur, utiliser le fallback
      const activities = await this.activityModel
        .find({ visibility: 'public' })
        .limit(20)
        .exec();

      return this.generateFallbackSuggestions(request, activities);
    }
  }

  private buildContext(request: AICoachSuggestionsRequestDto, activities: any[]): string {
    let context = `Données de fitness de l'utilisateur:
- ${request.workouts} entraînement${request.workouts > 1 ? 's' : ''} cette semaine
- ${request.calories} calories brûlées
- ${request.minutes} minutes d'activité
- Série de ${request.streak} jour${request.streak > 1 ? 's' : ''}\n\n`;

    if (request.sportPreferences) {
      context += `Sports préférés: ${request.sportPreferences}\n\n`;
    }

    context += `Activités disponibles dans l'application:\n`;
    activities.forEach((activity, index) => {
      const dateStr =
        activity.date instanceof Date
          ? activity.date.toLocaleDateString('fr-FR')
          : String(activity.date);
      const timeStr =
        activity.time instanceof Date
          ? activity.time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : String(activity.time);

      context += `${index + 1}. ID: ${activity._id} - ${activity.title} (${activity.sportType}) - ${activity.location} - ${dateStr} ${timeStr} - Niveau: ${activity.level} - Participants: ${activity.participantIds?.length || 0}/${activity.participants || 10}\n`;
    });

    return context;
  }

  private parseGeminiResponse(
    text: string,
    activities: any[],
  ): AICoachSuggestionsResponseDto {
    try {
      // Nettoyer la réponse (enlever markdown code blocks si présents)
      let cleanText = text.trim();
      if (cleanText.includes('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.includes('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanText);
      const suggestions: SuggestedActivityDto[] = [];

      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        parsed.suggestions.forEach((suggestion: any) => {
          // Trouver l'activité correspondante
          const activity = activities.find(
            (a) => a._id.toString() === suggestion.id,
          );
          if (activity) {
            const dateStr =
              activity.date instanceof Date
                ? activity.date.toLocaleDateString('fr-FR')
                : String(activity.date);
            const timeStr =
              activity.time instanceof Date
                ? activity.time.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : String(activity.time);

            suggestions.push({
              id: activity._id.toString(),
              title: activity.title || suggestion.title,
              sportType: activity.sportType || suggestion.sportType,
              location: activity.location || suggestion.location,
              date: dateStr,
              time: timeStr,
              participants: activity.participantIds?.length || suggestion.participants || 0,
              maxParticipants: activity.participants || suggestion.maxParticipants || 10,
              level: activity.level || suggestion.level || 'intermediate',
              matchScore: suggestion.matchScore || 85,
            });
          }
        });
      }

      // Si pas assez de suggestions, compléter avec des activités aléatoires
      if (suggestions.length < 3) {
        const remaining = activities
          .filter((a) => !suggestions.find((s) => s.id === a._id.toString()))
          .slice(0, 3 - suggestions.length);

        remaining.forEach((activity) => {
          const dateStr =
            activity.date instanceof Date
              ? activity.date.toLocaleDateString('fr-FR')
              : String(activity.date);
          const timeStr =
            activity.time instanceof Date
              ? activity.time.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : String(activity.time);

          suggestions.push({
            id: activity._id.toString(),
            title: activity.title,
            sportType: activity.sportType,
            location: activity.location,
            date: dateStr,
            time: timeStr,
            participants: activity.participantIds?.length || 0,
            maxParticipants: activity.participants || 10,
            level: activity.level,
            matchScore: 80 + Math.floor(Math.random() * 15),
          });
        });
      }

      return { suggestions: suggestions.slice(0, 3) };
    } catch (error) {
      this.logger.error('Error parsing Gemini response:', error);
      // En cas d'erreur de parsing, utiliser le fallback
      return this.generateFallbackSuggestions(
        {
          workouts: 0,
          calories: 0,
          minutes: 0,
          streak: 0,
        },
        activities,
      );
    }
  }

  private generateFallbackSuggestions(
    request: AICoachSuggestionsRequestDto,
    activities: any[],
  ): AICoachSuggestionsResponseDto {
    // Suggestions basées sur des règles simples (sans IA)
    const suggestions: SuggestedActivityDto[] = activities.slice(0, 3).map(
      (activity, index) => {
        const dateStr =
          activity.date instanceof Date
            ? activity.date.toLocaleDateString('fr-FR')
            : String(activity.date);
        const timeStr =
          activity.time instanceof Date
            ? activity.time.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : String(activity.time);

        return {
          id: activity._id.toString(),
          title: activity.title,
          sportType: activity.sportType,
          location: activity.location,
          date: dateStr,
          time: timeStr,
          participants: activity.participantIds?.length || 0,
          maxParticipants: activity.participants || 10,
          level: activity.level,
          matchScore: 85 - index * 5, // Scores décroissants
        };
      },
    );

    return { suggestions };
  }
}

