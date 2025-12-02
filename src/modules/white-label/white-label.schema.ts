import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WhiteLabelDocument = WhiteLabel & Document;

@Schema({ timestamps: true })
export class WhiteLabel {
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true,
    index: true 
  })
  userId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  enabled: boolean; // Si la White Label est activée

  // Logo et identité visuelle
  @Prop({ type: String })
  logoUrl?: string; // URL du logo personnalisé

  @Prop({ type: String, default: '#000000' })
  primaryColor: string; // Couleur principale de la marque

  @Prop({ type: String, default: '#FFFFFF' })
  secondaryColor: string; // Couleur secondaire

  @Prop({ type: String, default: '#808080' })
  accentColor: string; // Couleur d'accentuation

  @Prop({ type: String, default: 'Inter' })
  fontFamily: string; // Police de caractères

  @Prop({ type: String })
  companyName?: string; // Nom de l'entreprise/coach

  @Prop({ type: String })
  companyEmail?: string; // Email de contact

  // Domaines personnalisés
  @Prop({ type: String, unique: true, sparse: true })
  customDomain?: string; // Ex: activites.coachmartin.com

  @Prop({ type: Boolean, default: false })
  hideNexoBranding: boolean; // Masquer "Propulsé par Nexo Sports"

  @Prop({ type: String })
  footerText?: string; // Texte personnalisé pour le footer

  // Email personnalisé
  @Prop({ type: String })
  emailFromName?: string; // Nom d'envoi des emails

  @Prop({ type: String })
  emailFromAddress?: string; // Adresse d'envoi personnalisée

  // Personnalisation avancée
  @Prop({ type: Object })
  customCSS?: Record<string, any>; // CSS personnalisé (optionnel)

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Métadonnées personnalisées

  @Prop({ type: Date })
  activatedAt?: Date; // Date d'activation

  @Prop({ type: Date })
  expiresAt?: Date; // Date d'expiration (si nécessaire)
}

export const WhiteLabelSchema = SchemaFactory.createForClass(WhiteLabel);

// Index pour les requêtes fréquentes
WhiteLabelSchema.index({ userId: 1, enabled: 1 });
WhiteLabelSchema.index({ customDomain: 1 });
WhiteLabelSchema.index({ enabled: 1 });

