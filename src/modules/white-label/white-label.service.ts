import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhiteLabel, WhiteLabelDocument } from './white-label.schema';
import { CreateWhiteLabelDto } from './dto/create-white-label.dto';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto';
import { WhiteLabelResponseDto } from './dto/white-label-response.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionType } from '../subscription/subscription.schema';

@Injectable()
export class WhiteLabelService {
  private readonly logger = new Logger(WhiteLabelService.name);

  constructor(
    @InjectModel(WhiteLabel.name)
    private whiteLabelModel: Model<WhiteLabelDocument>,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Vérifie si l'utilisateur a accès à White Label (Premium Platinum requis)
   */
  async checkWhiteLabelAccess(userId: string): Promise<boolean> {
    try {
      const subscription = await this.subscriptionService.getUserSubscription(userId);
      
      if (!subscription) {
        return false;
      }

      // Vérifier que l'utilisateur a Premium Platinum
      const hasAccess = subscription.type === SubscriptionType.PREMIUM_PLATINUM && 
                       subscription.status === 'active';
      
      this.logger.debug(`White Label access check for user ${userId}: ${hasAccess}`);
      return hasAccess;
    } catch (error) {
      this.logger.error(`Error checking white label access for user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Valide un domaine personnalisé
   */
  private validateCustomDomain(domain: string): boolean {
    // Format valide : sous-domaine.example.com
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!domainRegex.test(domain)) {
      return false;
    }

    // Vérifier que ce n'est pas un domaine réservé
    const reservedDomains = [
      'www',
      'api',
      'admin',
      'mail',
      'ftp',
      'localhost',
      'nexo-sports.com',
    ];
    const parts = domain.split('.');
    const subdomain = parts[0];
    if (reservedDomains.includes(subdomain.toLowerCase())) {
      return false;
    }

    return true;
  }

  /**
   * Valide une couleur hexadécimale
   */
  private validateColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    return hexColorRegex.test(color);
  }

  /**
   * Valide une URL de logo
   */
  private validateLogoUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // Vérifier que c'est HTTPS
      if (urlObj.protocol !== 'https:') {
        return false;
      }
      // Vérifier les extensions d'image
      const validExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
      const pathname = urlObj.pathname.toLowerCase();
      return validExtensions.some(ext => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }

  /**
   * Crée ou met à jour la configuration White Label
   */
  async createOrUpdateWhiteLabel(
    userId: string,
    createDto: CreateWhiteLabelDto | UpdateWhiteLabelDto,
  ): Promise<WhiteLabelDocument> {
    // Vérifier l'accès Premium Platinum
    const hasAccess = await this.checkWhiteLabelAccess(userId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'White Label Solution requires Premium Platinum subscription'
      );
    }

    // Valider les couleurs
    if (createDto.primaryColor && !this.validateColor(createDto.primaryColor)) {
      throw new BadRequestException('Invalid primary color format. Use hex format (#RRGGBB)');
    }
    if (createDto.secondaryColor && !this.validateColor(createDto.secondaryColor)) {
      throw new BadRequestException('Invalid secondary color format. Use hex format (#RRGGBB)');
    }
    if (createDto.accentColor && !this.validateColor(createDto.accentColor)) {
      throw new BadRequestException('Invalid accent color format. Use hex format (#RRGGBB)');
    }

    // Valider l'URL du logo
    if (createDto.logoUrl && !this.validateLogoUrl(createDto.logoUrl)) {
      throw new BadRequestException('Invalid logo URL. Must be HTTPS and have a valid image extension (.png, .jpg, .jpeg, .svg, .webp)');
    }

    // Vérifier si un domaine personnalisé est déjà utilisé
    if (createDto.customDomain) {
      if (!this.validateCustomDomain(createDto.customDomain)) {
        throw new BadRequestException('Invalid custom domain format');
      }

      const existing = await this.whiteLabelModel.findOne({
        customDomain: createDto.customDomain,
        userId: { $ne: userId },
      }).exec();
      if (existing) {
        throw new BadRequestException(
          'This custom domain is already in use by another user'
        );
      }
    }

    // Créer ou mettre à jour
    let whiteLabel = await this.whiteLabelModel.findOne({ userId }).exec();
    if (whiteLabel) {
      // Mettre à jour
      Object.assign(whiteLabel, createDto);
      if (!whiteLabel.activatedAt) {
        whiteLabel.activatedAt = new Date();
      }
      whiteLabel.enabled = true; // Activer automatiquement après configuration
    } else {
      // Créer
      whiteLabel = new this.whiteLabelModel({
        userId,
        ...createDto,
        enabled: true,
        activatedAt: new Date(),
        primaryColor: createDto.primaryColor || '#000000',
        secondaryColor: createDto.secondaryColor || '#FFFFFF',
        accentColor: createDto.accentColor || '#808080',
        fontFamily: createDto.fontFamily || 'Inter',
        hideNexoBranding: createDto.hideNexoBranding ?? false,
      });
    }

    const saved = await whiteLabel.save();
    this.logger.log(`White Label configuration saved for user ${userId}`);
    
    return saved;
  }

  /**
   * Récupère la configuration White Label d'un utilisateur
   */
  async getWhiteLabelByUserId(userId: string): Promise<WhiteLabelDocument | null> {
    return this.whiteLabelModel.findOne({ userId }).exec();
  }

  /**
   * Récupère la configuration White Label par domaine personnalisé
   */
  async getWhiteLabelByDomain(customDomain: string): Promise<WhiteLabelDocument | null> {
    return this.whiteLabelModel.findOne({ 
      customDomain,
      enabled: true 
    }).exec();
  }

  /**
   * Active ou désactive White Label
   */
  async toggleWhiteLabel(userId: string, enabled: boolean): Promise<WhiteLabelDocument> {
    const hasAccess = await this.checkWhiteLabelAccess(userId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'White Label Solution requires Premium Platinum subscription'
      );
    }

    const whiteLabel = await this.whiteLabelModel.findOne({ userId }).exec();
    
    if (!whiteLabel) {
      throw new NotFoundException('White Label configuration not found');
    }

    whiteLabel.enabled = enabled;
    if (enabled && !whiteLabel.activatedAt) {
      whiteLabel.activatedAt = new Date();
    }

    return whiteLabel.save();
  }

  /**
   * Supprime la configuration White Label
   */
  async deleteWhiteLabel(userId: string): Promise<void> {
    const whiteLabel = await this.whiteLabelModel.findOne({ userId }).exec();
    
    if (whiteLabel) {
      await whiteLabel.deleteOne();
      this.logger.log(`White Label configuration deleted for user ${userId}`);
    }
  }

  /**
   * Génère le CSS personnalisé à partir de la configuration
   */
  generateCustomCSS(whiteLabel: WhiteLabelDocument): string {
    return `
      :root {
        --primary-color: ${whiteLabel.primaryColor};
        --secondary-color: ${whiteLabel.secondaryColor};
        --accent-color: ${whiteLabel.accentColor};
        --font-family: ${whiteLabel.fontFamily}, sans-serif;
      }
      
      .white-label-container {
        --primary: ${whiteLabel.primaryColor};
        --secondary: ${whiteLabel.secondaryColor};
        --accent: ${whiteLabel.accentColor};
        font-family: ${whiteLabel.fontFamily}, sans-serif;
      }
    `;
  }

  /**
   * Génère un HTML de prévisualisation
   */
  generatePreviewHTML(whiteLabel: WhiteLabelDocument): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: ${whiteLabel.fontFamily}, sans-serif;
            background: ${whiteLabel.secondaryColor};
            color: ${whiteLabel.primaryColor};
            margin: 0;
            padding: 20px;
          }
          .header {
            background: ${whiteLabel.primaryColor};
            color: ${whiteLabel.secondaryColor};
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .logo {
            max-width: 200px;
            height: auto;
            margin-bottom: 10px;
          }
          .content {
            padding: 20px;
            background: ${whiteLabel.secondaryColor};
            border: 2px solid ${whiteLabel.accentColor};
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${whiteLabel.logoUrl ? `<img src="${whiteLabel.logoUrl}" class="logo" alt="${whiteLabel.companyName || 'Logo'}" />` : ''}
          <h1>${whiteLabel.companyName || 'Votre Marque'}</h1>
        </div>
        <div class="content">
          <h2>Bienvenue sur votre plateforme personnalisée</h2>
          <p>Ceci est un aperçu de votre configuration White Label.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Convertit WhiteLabel en DTO de réponse
   */
  toResponseDto(whiteLabel: WhiteLabelDocument): WhiteLabelResponseDto {
    return {
      id: whiteLabel._id.toString(),
      userId: whiteLabel.userId.toString(),
      enabled: whiteLabel.enabled,
      logoUrl: whiteLabel.logoUrl,
      primaryColor: whiteLabel.primaryColor,
      secondaryColor: whiteLabel.secondaryColor,
      accentColor: whiteLabel.accentColor,
      fontFamily: whiteLabel.fontFamily,
      companyName: whiteLabel.companyName,
      companyEmail: whiteLabel.companyEmail,
      customDomain: whiteLabel.customDomain,
      hideNexoBranding: whiteLabel.hideNexoBranding,
      footerText: whiteLabel.footerText,
      emailFromName: whiteLabel.emailFromName,
      emailFromAddress: whiteLabel.emailFromAddress,
      activatedAt: whiteLabel.activatedAt,
      expiresAt: whiteLabel.expiresAt,
      createdAt: (whiteLabel as any).createdAt || new Date(),
      updatedAt: (whiteLabel as any).updatedAt || new Date(),
    };
  }
}

