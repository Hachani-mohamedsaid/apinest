import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
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
      return true;
    }

    // Si price > 0 → Session payante (avec limite)
    // Vérifier les limites seulement pour les sessions
    const limitCheck = await this.subscriptionService.checkActivityLimit(userId);

    if (!limitCheck.canCreate) {
      throw new ForbiddenException(limitCheck.message || 'Session limit reached');
    }

    // Ajouter les infos de limit dans la request pour utilisation ultérieure
    request.subscriptionLimit = limitCheck;

    return true;
  }
}

