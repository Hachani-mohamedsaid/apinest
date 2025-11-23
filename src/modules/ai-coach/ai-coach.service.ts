import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AICoachSuggestionsRequestDto } from './dto/suggestions-request.dto';
import { AICoachSuggestionsResponseDto, SuggestedActivityDto, PersonalizedTipDto } from './dto/suggestions-response.dto';

@Injectable()
export class AICoachService {
  private readonly logger = new Logger(AICoachService.name);
  private readonly geminiApiKey: string;
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private configService: ConfigService,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

      // ✅ NOUVEAU : Récupérer les données utilisateur complètes
      const user = await this.userModel.findById(userId).exec();
      const userActivities = await this.activityModel
        .find({ creator: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      if (!this.geminiApiKey || this.geminiApiKey === '' || !this.genAI) {
        // Mode fallback si Gemini n'est pas configuré
        this.logger.warn('Using fallback mode for AI Coach suggestions');
        return this.generateFallbackSuggestions(request, activities);
      }

      // ✅ Construire un contexte enrichi avec toutes les données
      const context = this.buildRichContext(request, user, userActivities, activities);

      // Appeler Gemini API
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      // ✅ Prompt pour suggestions + conseils
      const prompt = `Tu es un coach sportif IA personnalisé. Voici les données complètes de l'utilisateur:

${context}

**TÂCHE 1 : Suggestions d'activités**

Propose 3 activités sportives personnalisées parmi la liste fournie qui correspondent au profil de l'utilisateur.

**TÂCHE 2 : Conseils personnalisés (Nasy7)**

Basé sur toutes les données (statistiques Strava, profil, historique d'activités), génère 3-5 conseils personnalisés pertinents pour améliorer sa performance, santé, ou motivation.

Format de réponse JSON (STRICT):

{
  "suggestions": [
    {
      "id": "ID_activité_existant",
      "title": "Titre",
      "sportType": "Type",
      "location": "Lieu",
      "date": "JJ/MM/AAAA",
      "time": "HH:MM",
      "participants": nombre,
      "maxParticipants": nombre,
      "level": "niveau",
      "matchScore": score_0_100
    }
  ],
  "personalizedTips": [
    {
      "id": "tip-1",
      "title": "Titre du conseil",
      "description": "Description détaillée du conseil personnalisé",
      "icon": "🔥",
      "category": "training",
      "priority": "high"
    }
  ]
}

IMPORTANT:
- Utilise uniquement les IDs d'activités qui existent dans la liste
- Les conseils doivent être personnalisés selon les données réelles
- Les catégories possibles: training, nutrition, recovery, motivation, health
- Les icônes doivent être des emojis pertinents`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.debug(`Gemini response: ${text.substring(0, 200)}...`);

      // ✅ Parser la réponse JSON complète
      const parsedResponse = this.parseGeminiJSONResponse(text, activities);

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

  // ✅ NOUVEAU : Construire un contexte enrichi avec toutes les données
  private buildRichContext(
    request: AICoachSuggestionsRequestDto,
    user: any,
    userActivities: any[],
    availableActivities: any[],
  ): string {
    let context = `**Données Strava de la semaine:**
- Entraînements: ${request.workouts}
- Calories brûlées: ${request.calories}
- Minutes d'activité: ${request.minutes}
- Série (streak): ${request.streak} jours`;

    if (user) {
      context += `\n\n**Profil utilisateur:**
- Nom: ${user.name || 'Non spécifié'}
- Localisation: ${user.location || 'Non spécifiée'}
- Sports préférés: ${user.sportsInterests?.join(', ') || 'Aucun'}
- Niveau XP: ${user.currentLevel || 1}
- Total XP: ${user.totalXp || 0}`;
    }

    if (userActivities && userActivities.length > 0) {
      context += `\n\n**Historique des activités:**
L'utilisateur a créé ${userActivities.length} activités récemment:`;
      userActivities.slice(0, 5).forEach((act, idx) => {
        context += `\n${idx + 1}. ${act.sportType} - ${act.title} (${act.level})`;
      });
    }

    context += `\n\n**Activités disponibles dans l'app:**`;
    availableActivities.slice(0, 10).forEach((act, idx) => {
      const dateStr =
        act.date instanceof Date
          ? act.date.toLocaleDateString('fr-FR')
          : String(act.date);
      const timeStr =
        act.time instanceof Date
          ? act.time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : String(act.time);
      context += `\n${idx + 1}. ID: ${act._id} - ${act.title} (${act.sportType}) - ${act.location} - ${dateStr} ${timeStr} - Niveau: ${act.level} - Participants: ${act.participantIds?.length || 0}/${act.participants || 10}`;
    });

    return context;
  }

  // ✅ NOUVEAU : Parser la réponse JSON complète
  private parseGeminiJSONResponse(
    text: string,
    activities: any[],
  ): AICoachSuggestionsResponseDto {
    try {
      // Nettoyer la réponse (enlever markdown code blocks si présent)
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanText);
      const suggestions: SuggestedActivityDto[] = [];
      const personalizedTips: PersonalizedTipDto[] = [];

      // Parser les suggestions
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

      // Parser les conseils personnalisés
      if (parsed.personalizedTips && Array.isArray(parsed.personalizedTips)) {
        parsed.personalizedTips.forEach((tip: any, index: number) => {
          personalizedTips.push({
            id: tip.id || `tip-${index + 1}`,
            title: tip.title || 'Conseil personnalisé',
            description: tip.description || '',
            icon: tip.icon || '💡',
            category: tip.category || 'training',
            priority: tip.priority || 'medium',
          });
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

      return {
        suggestions: suggestions.slice(0, 3),
        personalizedTips: personalizedTips.length > 0 ? personalizedTips : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to parse Gemini JSON response:', error);
      this.logger.error('Raw response:', text);
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

    // ✅ Conseils par défaut si Gemini n'est pas disponible
    const defaultTips: PersonalizedTipDto[] = [
      {
        id: 'default-tip-1',
        title: 'Maintenez votre série',
        description: `Vous avez une série de ${request.streak} jours ! Continuez à vous entraîner régulièrement pour maintenir cette habitude.`,
        icon: '🔥',
        category: 'motivation',
        priority: 'high',
      },
      {
        id: 'default-tip-2',
        title: 'Augmentez progressivement',
        description: `Cette semaine, vous avez fait ${request.workouts} entraînements. Essayez d'en ajouter 1 ou 2 de plus la semaine prochaine.`,
        icon: '📈',
        category: 'training',
        priority: 'medium',
      },
      {
        id: 'default-tip-3',
        title: 'Récupération active',
        description: "N'oubliez pas de prendre du temps pour récupérer entre les séances d'entraînement.",
        icon: '🧘',
        category: 'recovery',
        priority: 'medium',
      },
    ];

    return {
      suggestions,
      personalizedTips: defaultTips,
    };
  }
}

