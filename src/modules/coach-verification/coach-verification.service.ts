import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CoachVerificationAIRequestDto } from './dto/verify-ai-request.dto';
import {
  CoachVerificationAIResponseDto,
  DocumentAnalysisResultDto,
} from './dto/verify-ai-response.dto';

@Injectable()
export class CoachVerificationService {
  private readonly logger = new Logger(CoachVerificationService.name);
  private readonly openaiApiKey: string;
  private readonly openaiApiUrl =
    'https://api.openai.com/v1/chat/completions';

  constructor(private configService: ConfigService) {
    this.openaiApiKey =
      this.configService.get<string>('OPENAI_API_KEY') || '';

    if (!this.openaiApiKey) {
      this.logger.warn(
        '⚠️ OPENAI_API_KEY not configured. Coach verification will use fallback mode.',
      );
    } else {
      this.logger.log('✅ OpenAI API key configured for coach verification');
    }
  }

  async verifyCoachWithAI(
    request: CoachVerificationAIRequestDto,
  ): Promise<CoachVerificationAIResponseDto> {
    try {
      if (!this.openaiApiKey) {
        // Mode fallback si OpenAI n'est pas configuré
        this.logger.warn('Using fallback verification mode');
        return this.fallbackVerification(request);
      }

      // Construire le prompt pour ChatGPT
      const prompt = this.buildVerificationPrompt(request);

      this.logger.log('🤖 Calling OpenAI API for coach verification...');

      // Appeler ChatGPT API
      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: 'gpt-3.5-turbo', // Utiliser gpt-3.5-turbo (plus économique) ou gpt-4 (plus performant)
          messages: [
            {
              role: 'system',
              content:
                "Tu es un expert en vérification de profils de coach/trainer. Analyse les informations fournies et détermine si l'utilisateur est vraiment un coach professionnel. Réponds UNIQUEMENT en JSON.",
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Plus bas pour des réponses plus cohérentes
          max_tokens: 1000,
          response_format: { type: 'json_object' }, // Forcer la réponse en JSON
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 secondes timeout
        },
      );

      const aiResponse = response.data.choices[0].message.content;

      this.logger.log(
        `✅ OpenAI API response received (${aiResponse.length} characters)`,
      );

      // Parser la réponse JSON de ChatGPT
      const aiResult = this.parseChatGPTResponse(aiResponse);

      // Analyser les documents/images
      const documentAnalysis = await this.analyzeDocuments(
        request.documents,
      );

      // Calculer le score de confiance final
      const confidenceScore = this.calculateConfidenceScore(
        aiResult,
        documentAnalysis,
        request,
      );

      // Déterminer si c'est un coach
      const isCoach = confidenceScore >= 0.5;

      // Générer les raisons de vérification
      const verificationReasons = this.generateVerificationReasons(
        aiResult,
        documentAnalysis,
        request,
      );

      return {
        isCoach,
        confidenceScore,
        verificationReasons,
        aiAnalysis: aiResult.analysis,
        documentAnalysis,
      };
    } catch (error) {
      this.logger.error('Error in AI Coach Verification with ChatGPT:', error);
      if (error.response) {
        this.logger.error('OpenAI API Error:', error.response.data);
      }
      // En cas d'erreur, utiliser le mode fallback
      return this.fallbackVerification(request);
    }
  }

  private buildVerificationPrompt(
    request: CoachVerificationAIRequestDto,
  ): string {
    return `
Analyse les informations suivantes d'un utilisateur qui demande à être vérifié comme coach/trainer.

**Informations de l'utilisateur:**

- Type: ${request.userType}
- Nom: ${request.fullName}
- Email: ${request.email}
- Description: ${request.about}
- Spécialisation: ${request.specialization}
- Années d'expérience: ${request.yearsOfExperience}
- Certifications: ${request.certifications}
- Localisation: ${request.location}
- Documents fournis: ${request.documents.length} fichier(s)
- Note additionnelle: ${request.note || 'Aucune'}

**Tâche:**

Détermine si cet utilisateur est vraiment un coach/trainer professionnel basé sur:

1. Le type d'utilisateur sélectionné
2. La description et spécialisation
3. Les certifications mentionnées
4. L'expérience déclarée
5. Les documents fournis (certifications, ID, licence)

**Réponds UNIQUEMENT en JSON avec ce format exact:**

{
  "isCoach": true,
  "confidence": 0.85,
  "analysis": "Analyse détaillée en français",
  "reasons": ["Raison 1", "Raison 2", "Raison 3"]
}

IMPORTANT: Réponds uniquement avec le JSON, sans texte supplémentaire.
`;
  }

  private parseChatGPTResponse(text: string): any {
    try {
      // ChatGPT avec response_format: json_object retourne directement du JSON
      const parsed = JSON.parse(text);
      return {
        isCoach: parsed.isCoach || false,
        confidence: parsed.confidence || 0.0,
        analysis: parsed.analysis || 'Analyse effectuée',
        reasons: parsed.reasons || [],
      };
    } catch (e) {
      this.logger.error('Failed to parse ChatGPT response:', e);
      // Essayer d'extraire le JSON si la réponse contient du texte autour
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            isCoach: parsed.isCoach || false,
            confidence: parsed.confidence || 0.0,
            analysis: parsed.analysis || 'Analyse effectuée',
            reasons: parsed.reasons || [],
          };
        }
      } catch (e2) {
        this.logger.error('Failed to extract JSON from response:', e2);
      }
      return {
        isCoach: false,
        confidence: 0.0,
        analysis: "Erreur lors de l'analyse",
        reasons: [],
      };
    }
  }

  private async analyzeDocuments(
    documents: string[],
  ): Promise<DocumentAnalysisResultDto> {
    // Analyser les types de documents
    const documentTypes: string[] = [];
    let documentsVerified = 0;

    for (const docUrl of documents) {
      // Détecter le type de document par l'URL ou le nom
      const lowerUrl = docUrl.toLowerCase();
      if (
        lowerUrl.includes('certification') ||
        lowerUrl.includes('cert')
      ) {
        documentTypes.push('certification');
        documentsVerified++;
      } else if (
        lowerUrl.includes('id') ||
        lowerUrl.includes('identity')
      ) {
        documentTypes.push('id');
        documentsVerified++;
      } else if (
        lowerUrl.includes('license') ||
        lowerUrl.includes('licence')
      ) {
        documentTypes.push('license');
        documentsVerified++;
      } else {
        documentTypes.push('other');
      }
    }

    return {
      documentsVerified,
      totalDocuments: documents.length,
      documentTypes,
      isValid: documentsVerified > 0,
    };
  }

  private calculateConfidenceScore(
    aiResult: any,
    documentAnalysis: DocumentAnalysisResultDto,
    request: CoachVerificationAIRequestDto,
  ): number {
    let score = 0.0;

    // Score de l'IA (40%)
    score += aiResult.confidence * 0.4;

    // Score basé sur les documents (30%)
    if (documentAnalysis.isValid && documentAnalysis.documentsVerified > 0) {
      score += 0.3;
    }

    // Score basé sur les données du formulaire (30%)
    const userType = request.userType.toLowerCase();
    if (userType.includes('coach') || userType.includes('trainer')) {
      score += 0.1;
    }
    if (request.specialization && request.specialization.trim().length > 0) {
      score += 0.1;
    }
    if (request.certifications && request.certifications.trim().length > 0) {
      score += 0.1;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  private generateVerificationReasons(
    aiResult: any,
    documentAnalysis: DocumentAnalysisResultDto,
    request: CoachVerificationAIRequestDto,
  ): string[] {
    const reasons: string[] = [];

    // Raisons de l'IA
    if (aiResult.reasons && aiResult.reasons.length > 0) {
      reasons.push(...aiResult.reasons);
    }

    // Raisons basées sur les documents
    if (documentAnalysis.isValid) {
      reasons.push(
        `${documentAnalysis.documentsVerified} document(s) de vérification fourni(s)`,
      );
    }

    // Raisons basées sur les données
    if (request.specialization) {
      reasons.push(`Spécialisation: ${request.specialization}`);
    }
    if (request.certifications) {
      reasons.push('Certifications mentionnées');
    }
    if (request.yearsOfExperience) {
      reasons.push(`Expérience: ${request.yearsOfExperience} années`);
    }

    return reasons;
  }

  private fallbackVerification(
    request: CoachVerificationAIRequestDto,
  ): CoachVerificationAIResponseDto {
    // Mode fallback simple basé sur des règles
    const userType = request.userType.toLowerCase();
    const isCoachType =
      userType.includes('coach') || userType.includes('trainer');

    let score = 0.0;
    const reasons: string[] = [];

    if (isCoachType) {
      score += 0.3;
      reasons.push("Type d'utilisateur: Coach/Trainer");
    }
    if (request.specialization) {
      score += 0.2;
      reasons.push(`Spécialisation: ${request.specialization}`);
    }
    if (request.certifications) {
      score += 0.2;
      reasons.push('Certifications mentionnées');
    }
    if (request.documents.length > 0) {
      score += 0.2;
      reasons.push(`${request.documents.length} document(s) fourni(s)`);
    }
    if (request.yearsOfExperience) {
      score += 0.1;
      reasons.push(`Expérience: ${request.yearsOfExperience} années`);
    }

    return {
      isCoach: score >= 0.5,
      confidenceScore: Math.min(1.0, score),
      verificationReasons: reasons,
      aiAnalysis: 'Mode fallback (OpenAI non configuré)',
      documentAnalysis: {
        documentsVerified: request.documents.length,
        totalDocuments: request.documents.length,
        documentTypes: [],
        isValid: request.documents.length > 0,
      },
    };
  }
}

