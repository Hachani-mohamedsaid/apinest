import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AICoachSuggestionsRequestDto } from './dto/suggestions-request.dto';
import { AICoachSuggestionsResponseDto, SuggestedActivityDto, PersonalizedTipDto } from './dto/suggestions-response.dto';
import { PersonalizedTipsRequestDto } from './dto/personalized-tips-request.dto';
import { PersonalizedTipsResponseDto } from './dto/personalized-tips-response.dto';
import { YouTubeVideosRequestDto } from './dto/youtube-videos-request.dto';
import { YouTubeVideosResponseDto, YouTubeVideoDto } from './dto/youtube-videos-response.dto';

@Injectable()
export class AICoachService {
  private readonly logger = new Logger(AICoachService.name);
  private readonly geminiApiKey: string;
  private readonly openaiApiKey: string;
  private readonly youtubeApiKey: string;
  private genAI: GoogleGenerativeAI | null = null;
  private openai: OpenAI | null = null;
  private availableModel: string | null = null; // Modèle disponible détecté

  constructor(
    private configService: ConfigService,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    // Configuration Gemini
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';

    if (!this.geminiApiKey) {
      this.logger.warn(
        '⚠️ GEMINI_API_KEY not configured. AI Coach suggestions will use fallback mode.',
      );
    } else {
      try {
        this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
        this.logger.log('✅ Google Gemini AI initialized successfully');
        this.logger.log(`Using Gemini API key: ${this.geminiApiKey.substring(0, 10)}...`);
        
        // Essayer de détecter un modèle disponible (en arrière-plan, ne bloque pas)
        this.detectAvailableModel().catch((error) => {
          this.logger.warn('Could not detect available model, will try at runtime:', error.message);
        });
      } catch (error) {
        this.logger.error('❌ Error initializing Google Gemini AI:', error);
      }
    }

    // Configuration OpenAI (ChatGPT)
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    if (!this.openaiApiKey) {
      this.logger.warn('⚠️ OPENAI_API_KEY not configured. ChatGPT personalized tips will use fallback mode.');
    } else {
      try {
        this.openai = new OpenAI({ apiKey: this.openaiApiKey });
        this.logger.log('✅ OpenAI (ChatGPT) initialized successfully');
      } catch (error) {
        this.logger.error('❌ Error initializing OpenAI:', error);
      }
    }

    // Configuration YouTube
    this.youtubeApiKey = this.configService.get<string>('YOUTUBE_API_KEY') || '';
    if (!this.youtubeApiKey) {
      this.logger.warn('⚠️ YOUTUBE_API_KEY not configured. YouTube videos will be unavailable.');
    } else {
      this.logger.log('✅ YouTube API key configured');
    }
  }

  /**
   * Détecte un modèle Gemini disponible en testant plusieurs modèles
   */
  private async detectAvailableModel(): Promise<void> {
    if (!this.geminiApiKey || !this.genAI) {
      return;
    }

    const modelNames = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    
    for (const modelName of modelNames) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        // Test simple avec un prompt minimal
        const result = await model.generateContent('test');
        await result.response;
        this.availableModel = modelName;
        this.logger.log(`✅ Detected available Gemini model: ${modelName}`);
        return;
      } catch (error: any) {
        this.logger.debug(`Model ${modelName} not available: ${error.message}`);
        continue;
      }
    }
    
    this.logger.warn('⚠️ No Gemini model detected, will use fallback');
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

      // Appeler Gemini API via REST (plus de contrôle sur la version de l'API)
      // Note: Le SDK peut avoir des problèmes avec certains modèles
      // Utiliser l'API REST directement pour plus de flexibilité
      
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

      this.logger.log('🤖 Calling Gemini API for personalized suggestions and tips...');
      
      // Essayer d'abord avec le SDK
      let text: string;
      try {
        // Utiliser le modèle détecté, ou essayer gemini-pro par défaut
        const modelName = this.availableModel || 'gemini-pro';
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
      } catch (sdkError: any) {
        // Si le SDK échoue, essayer avec l'API REST directement
        this.logger.warn('SDK failed, trying REST API directly...');
        
        // Essayer différents modèles et versions d'API
        const apiVersions = ['v1', 'v1beta'];
        const modelNames = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        let restSuccess = false;
        
        for (const apiVersion of apiVersions) {
          for (const modelName of modelNames) {
            try {
              this.logger.debug(`Trying REST API: ${apiVersion}/models/${modelName}`);
              const restResponse = await axios.post(
                `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${this.geminiApiKey}`,
                {
                  contents: [{
                    parts: [{
                      text: prompt
                    }]
                  }]
                },
                {
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  timeout: 30000
                }
              );
              
              if (restResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                text = restResponse.data.candidates[0].content.parts[0].text;
                this.logger.log(`✅ Successfully called Gemini via REST API (${apiVersion}/${modelName})`);
                restSuccess = true;
                break;
              }
            } catch (restError: any) {
              // Continuer avec le prochain modèle/version
              this.logger.debug(`REST API failed for ${apiVersion}/${modelName}: ${restError.response?.status || restError.message}`);
              continue;
            }
          }
          if (restSuccess) break;
        }
        
        if (!restSuccess) {
          // Si tous les modèles/versions échouent, lancer l'erreur pour utiliser le fallback
          this.logger.error('All Gemini API attempts failed, using fallback');
          throw new Error('No available Gemini model found');
        }
      }

      this.logger.log(`✅ Gemini API response received (${text.length} characters)`);
      this.logger.debug(`Gemini response preview: ${text.substring(0, 300)}...`);

      // ✅ Parser la réponse JSON complète
      const parsedResponse = this.parseGeminiJSONResponse(text, activities, request);

      // Vérifier si on a des conseils générés par Gemini (pas fallback)
      if (parsedResponse.personalizedTips && parsedResponse.personalizedTips.length > 0) {
        const firstTipId = parsedResponse.personalizedTips[0].id;
        if (!firstTipId.startsWith('default-tip-')) {
          this.logger.log(`✅ Gemini generated ${parsedResponse.personalizedTips.length} personalized tips`);
        } else {
          this.logger.warn('⚠️ Parsed response contains default tips - falling back');
        }
      }

      return parsedResponse;
    } catch (error) {
      this.logger.error('❌ Error in AI Coach Gemini:', error);
      this.logger.error('Error details:', error.message);
      if (error.stack) {
        this.logger.error('Stack trace:', error.stack);
      }

      // En cas d'erreur, utiliser le fallback
      this.logger.warn('⚠️ Using fallback mode due to error');
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
    request: AICoachSuggestionsRequestDto,
  ): AICoachSuggestionsResponseDto {
    try {
      this.logger.debug('🔍 Parsing Gemini JSON response...');
      
      // Nettoyer la réponse (enlever markdown code blocks si présent)
      let cleanText = text.trim();
      
      // Chercher le JSON dans la réponse (peut être entouré de texte)
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }
      
      if (cleanText.includes('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.includes('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      this.logger.debug(`Cleaned JSON text length: ${cleanText.length}`);

      const parsed = JSON.parse(cleanText);
      this.logger.debug('✅ JSON parsed successfully');
      
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
        this.logger.log(`📝 Found ${parsed.personalizedTips.length} personalized tips in Gemini response`);
        parsed.personalizedTips.forEach((tip: any, index: number) => {
          // ✅ Générer un ID unique pour les conseils Gemini (pas "default-tip-")
          const tipId = tip.id && !tip.id.startsWith('default-tip-') 
            ? tip.id 
            : `gemini-tip-${Date.now()}-${index + 1}`;
          
          personalizedTips.push({
            id: tipId,
            title: tip.title || 'Conseil personnalisé',
            description: tip.description || '',
            icon: tip.icon || '💡',
            category: tip.category || 'training',
            priority: tip.priority || 'medium',
          });
        });
        this.logger.log(`✅ Parsed ${personalizedTips.length} personalized tips successfully`);
      } else {
        this.logger.warn('⚠️ No personalizedTips found in Gemini response');
        this.logger.debug('Parsed object keys:', Object.keys(parsed));
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

      // Si pas de conseils générés par Gemini, utiliser le fallback pour les conseils
      if (personalizedTips.length === 0) {
        this.logger.warn('⚠️ No personalized tips parsed from Gemini - using fallback tips');
        const fallbackTips = this.generateDefaultTips(request);
        return {
          suggestions: suggestions.slice(0, 3),
          personalizedTips: fallbackTips,
        };
      }

      const result = {
        suggestions: suggestions.slice(0, 3),
        personalizedTips: personalizedTips,
      };

      this.logger.log(`✅ Successfully parsed ${result.personalizedTips.length} personalized tips from Gemini`);

      return result;
    } catch (error) {
      this.logger.error('❌ Failed to parse Gemini JSON response:', error);
      this.logger.error('Error message:', error.message);
      this.logger.error('Raw response (first 500 chars):', text.substring(0, 500));
      
      // En cas d'erreur de parsing, utiliser le fallback
      this.logger.warn('⚠️ Falling back to default tips due to parsing error');
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

    return {
      suggestions,
      personalizedTips: this.generateDefaultTips(request),
    };
  }

  // ✅ Méthode séparée pour générer les conseils par défaut
  private generateDefaultTips(request: AICoachSuggestionsRequestDto): PersonalizedTipDto[] {
    return [
      {
        id: 'default-tip-1',
        title: 'Maintenez votre série',
        description: `Vous avez une série de ${request.streak} jour${request.streak > 1 ? 's' : ''} ! Continuez à vous entraîner régulièrement pour maintenir cette habitude.`,
        icon: '🔥',
        category: 'motivation',
        priority: 'high',
      },
      {
        id: 'default-tip-2',
        title: 'Augmentez progressivement',
        description: `Cette semaine, vous avez fait ${request.workouts} entraînement${request.workouts > 1 ? 's' : ''}. Essayez d'en ajouter 1 ou 2 de plus la semaine prochaine.`,
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
  }

  /**
   * Génère des conseils personnalisés avec ChatGPT
   */
  async generatePersonalizedTips(
    request: PersonalizedTipsRequestDto,
  ): Promise<PersonalizedTipsResponseDto> {
    if (!this.openai) {
      this.logger.warn('OpenAI not configured, returning default tips');
      return this.getDefaultTips(request);
    }

    try {
      const systemPrompt = `Tu es un coach sportif IA expert. Tu donnes des conseils personnalisés et motivants en français. 
Réponds toujours en français avec des conseils pratiques et encourageants.`;

      const userPrompt = this.buildUserPrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const aiMessage = completion.choices[0]?.message?.content;
      if (!aiMessage) {
        this.logger.warn('OpenAI returned empty response');
        return this.getDefaultTips(request);
      }

      // Parser la réponse JSON de ChatGPT
      const tips = this.parseTipsFromAIResponse(aiMessage);
      return { tips };
    } catch (error) {
      this.logger.error('Error generating personalized tips with OpenAI', error);
      return this.getDefaultTips(request);
    }
  }

  /**
   * Récupère des vidéos YouTube pertinentes
   */
  async getYouTubeVideos(
    request: YouTubeVideosRequestDto,
  ): Promise<YouTubeVideosResponseDto> {
    if (!this.youtubeApiKey) {
      this.logger.warn('YouTube API key not configured');
      return { videos: [] };
    }

    try {
      const searchQuery = this.buildYouTubeSearchQuery(request.sportPreferences);
      const maxResults = request.maxResults || 10;

      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: this.youtubeApiKey,
          part: 'snippet',
          q: searchQuery,
          type: 'video',
          maxResults,
          videoCategoryId: '17', // Sports category
          order: 'relevance',
        },
      });

      const videos = response.data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url ||
          '',
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      }));

      // Optionnel: Récupérer les détails supplémentaires (durée, vues)
      if (videos.length > 0) {
        const videoIds = videos.map((v: any) => v.id).join(',');
        const detailsResponse = await axios.get(
          'https://www.googleapis.com/youtube/v3/videos',
          {
            params: {
              key: this.youtubeApiKey,
              part: 'contentDetails,statistics',
              id: videoIds,
            },
          },
        );

        const detailsMap = new Map();
        detailsResponse.data.items.forEach((item: any) => {
          detailsMap.set(item.id, {
            duration: item.contentDetails?.duration,
            viewCount: item.statistics?.viewCount,
          });
        });

        videos.forEach((video: any) => {
          const details = detailsMap.get(video.id);
          if (details) {
            video.duration = details.duration;
            video.viewCount = details.viewCount;
          }
        });
      }

      return { videos };
    } catch (error) {
      this.logger.error('Error fetching YouTube videos', error);
      return { videos: [] };
    }
  }

  /**
   * Construit le prompt utilisateur pour ChatGPT
   */
  private buildUserPrompt(request: PersonalizedTipsRequestDto): string {
    let prompt = `Génère 3-5 conseils personnalisés pour améliorer mes performances sportives.\n\n`;

    prompt += `Mes statistiques de la semaine:\n`;
    prompt += `- Entraînements: ${request.workouts}\n`;
    prompt += `- Calories brûlées: ${request.calories}\n`;
    prompt += `- Minutes d'activité: ${request.minutes}\n`;
    prompt += `- Série actuelle: ${request.streak} jours\n\n`;

    if (request.stravaData) {
      prompt += `Données Strava: ${request.stravaData}\n\n`;
    }

    if (request.sportPreferences && request.sportPreferences.length > 0) {
      prompt += `Sports préférés: ${request.sportPreferences.join(', ')}\n\n`;
    }

    if (request.recentActivities && request.recentActivities.length > 0) {
      prompt += `Activités récentes: ${request.recentActivities.join(', ')}\n\n`;
    }

    prompt += `Génère des conseils personnalisés, motivants et pratiques. `;
    prompt += `Chaque conseil doit avoir:\n`;
    prompt += `1. Un titre court et accrocheur\n`;
    prompt += `2. Une description détaillée et pratique\n`;
    prompt += `3. Une catégorie (motivation, training, recovery, nutrition, etc.)\n`;
    prompt += `4. Un emoji approprié\n\n`;
    prompt += `Réponds au format JSON avec un tableau de conseils, chaque conseil ayant: id, title, description, icon, category`;

    return prompt;
  }

  /**
   * Parse la réponse JSON de ChatGPT
   */
  private parseTipsFromAIResponse(aiMessage: string): PersonalizedTipDto[] {
    try {
      // Extraire le JSON de la réponse
      const jsonStart = aiMessage.indexOf('[');
      const jsonEnd = aiMessage.lastIndexOf(']') + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = aiMessage.substring(jsonStart, jsonEnd);
        const tipsArray = JSON.parse(jsonString);

        return tipsArray.map((tip: any, index: number) => ({
          id: tip.id || `ai-tip-${Date.now()}-${index}`,
          title: tip.title || 'Conseil personnalisé',
          description: tip.description || '',
          icon: tip.icon || '💡',
          category: tip.category || 'general',
          priority: tip.priority,
        }));
      }

      // Si pas de JSON, créer un conseil à partir du texte
      return [
        {
          id: `ai-tip-${Date.now()}`,
          title: 'Conseil personnalisé',
          description: aiMessage.substring(0, 200),
          icon: '💡',
          category: 'general',
        },
      ];
    } catch (error) {
      this.logger.error('Error parsing AI response', error);
      return [];
    }
  }

  /**
   * Construit la requête de recherche YouTube
   */
  private buildYouTubeSearchQuery(sportPreferences?: string[]): string {
    if (sportPreferences && sportPreferences.length > 0) {
      const sports = sportPreferences.join(' OR ');
      return `${sports} workout tutorial training`;
    }
    return 'fitness workout tutorial training';
  }

  /**
   * Retourne des conseils par défaut pour ChatGPT
   */
  private getDefaultTips(
    request: PersonalizedTipsRequestDto,
  ): PersonalizedTipsResponseDto {
    const tips: PersonalizedTipDto[] = [];

    if (request.workouts < 5) {
      tips.push({
        id: 'default-1',
        title: 'Maintenez votre série',
        description: `Vous avez une série de ${request.streak} jour${request.streak > 1 ? 's' : ''} ! Continuez à vous entraîner régulièrement pour maintenir cette habitude.`,
        icon: '🔥',
        category: 'motivation',
      });
    }

    if (request.workouts === 0) {
      tips.push({
        id: 'default-2',
        title: 'Augmentez progressivement',
        description: `Cette semaine, vous avez fait ${request.workouts} entraînement. Essayez d'en ajouter 1 ou 2 de plus la semaine prochaine.`,
        icon: '📈',
        category: 'training',
      });
    }

    tips.push({
      id: 'default-3',
      title: 'Récupération active',
      description:
        "N'oubliez pas de prendre du temps pour récupérer entre les séances d'entraînement.",
      icon: '🧘',
      category: 'recovery',
    });

    return { tips };
  }
}

