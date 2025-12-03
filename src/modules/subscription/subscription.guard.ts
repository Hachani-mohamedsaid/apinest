import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionLimitGuard.name);

  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?._id?.toString() || request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // ✅ DIFFÉRENCIER : Activité normale vs Session
    // Récupérer le body de la requête pour vérifier le prix
    const body = request.body;
    const price = body?.price;

    // Si price est null, undefined ou 0 → Activité normale (gratuite, pas de limite)
    // Les activités normales sont toujours autorisées
    if (price == null || price === 0) {
      // Activité normale : Toujours autorisée, pas de vérification de limite
      this.logger.log(
        `✅ Normal activity (price=${price}) - Always allowed for user ${userId}`,
      );
      return true;
    }

    // Si price > 0 → Session payante (avec limite)
    // Vérifier les limites seulement pour les sessions
    this.logger.log(
      `🔍 Session (price=${price}) - Checking limits for user ${userId}`,
    );

    const limitCheck = await this.subscriptionService.checkActivityLimit(userId);

    if (!limitCheck.canCreate) {
      this.logger.warn(
        `❌ Session creation blocked for user ${userId}: ${limitCheck.message}`,
      );
      throw new ForbiddenException(limitCheck.message || 'Session limit reached');
    }

    this.logger.log(
      `✅ Session limits OK for user ${userId} (used: ${limitCheck.activitiesUsed}/${limitCheck.activitiesLimit})`,
    );

    // Ajouter les infos de limit dans la request pour utilisation ultérieure
    request.subscriptionLimit = limitCheck;

    return true;
  }
}

