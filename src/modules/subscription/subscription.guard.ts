import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
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
    const user = request.user;
    const body = request.body;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // ✅ MODIFICATION PRINCIPALE : Vérifier le prix
    const price = body?.price;

    // Si price est null, undefined, ou 0 → Activité normale (toujours autorisée)
    if (price == null || price === 0 || price === '0') {
      const userId = user._id?.toString() || user.id || user.userId || user.sub;
      this.logger.log(
        `✅ Normal activity (price=${price}) - Always allowed for user ${userId}`,
      );
      return true; // ✅ AUTORISER les activités normales
    }

    // Si price > 0 → Session payante (vérifier les limites)
    const priceNumber = typeof price === 'string' ? parseFloat(price) : price;
    if (priceNumber > 0) {
      const userId = user._id?.toString() || user.id || user.userId || user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found');
      }

      this.logger.log(
        `🔒 Session (price=${priceNumber}) - Checking limits for user ${userId}`,
      );

      // Utiliser checkActivityLimit() qui retourne un objet avec canCreate
      const limitCheck = await this.subscriptionService.checkActivityLimit(userId);

      if (!limitCheck.canCreate) {
        this.logger.warn(
          `❌ Session creation blocked for user ${userId}: ${limitCheck.message}`,
        );
        throw new ForbiddenException(
          limitCheck.message || 'Vous avez utilisé votre activité gratuite. Passez à Premium pour créer plus d\'activités.',
        );
      }

      this.logger.log(
        `✅ Session limits OK for user ${userId} (used: ${limitCheck.activitiesUsed}/${limitCheck.activitiesLimit})`,
      );

      // Ajouter les infos de limit dans la request pour utilisation ultérieure
      request.subscriptionLimit = limitCheck;

      return true;
    }

    // Par défaut, autoriser (pour éviter de bloquer par erreur)
    return true;
  }
}

