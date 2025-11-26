import { ApiProperty } from '@nestjs/swagger';

export class DocumentAnalysisResultDto {
  @ApiProperty({ example: 2, description: 'Number of verified documents' })
  documentsVerified: number;

  @ApiProperty({ example: 2, description: 'Total number of documents' })
  totalDocuments: number;

  @ApiProperty({ example: ['certification', 'id'], description: 'Types of documents', type: [String] })
  documentTypes: string[];

  @ApiProperty({ example: true, description: 'Whether documents are valid' })
  isValid: boolean;
}

export class CoachVerificationAIResponseDto {
  @ApiProperty({ example: true, description: 'Whether the user is verified as a coach' })
  isCoach: boolean;

  @ApiProperty({ example: 0.85, description: 'Confidence score from 0.0 to 1.0' })
  confidenceScore: number; // 0.0 à 1.0

  @ApiProperty({ 
    example: ['Type d\'utilisateur: Coach/Trainer', '2 document(s) de vérification fourni(s)'], 
    description: 'Reasons for verification',
    type: [String]
  })
  verificationReasons: string[];

  @ApiProperty({ 
    example: 'Analyse détaillée en français', 
    description: 'AI analysis text',
    required: false
  })
  aiAnalysis?: string;

  @ApiProperty({ 
    description: 'Document analysis results',
    type: DocumentAnalysisResultDto,
    required: false
  })
  documentAnalysis?: DocumentAnalysisResultDto;
}

