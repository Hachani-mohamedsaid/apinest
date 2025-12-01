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

    const limitCheck = await this.subscriptionService.checkActivityLimit(userId);

    if (!limitCheck.canCreate) {
      throw new ForbiddenException(limitCheck.message || 'Activity limit reached');
    }

    // Ajouter les infos de limit dans la request pour utilisation ultérieure
    request.subscriptionLimit = limitCheck;

    return true;
  }
}

