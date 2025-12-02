import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { WhiteLabelService } from './white-label.service';

@Injectable()
export class WhiteLabelAccessGuard implements CanActivate {
  constructor(private whiteLabelService: WhiteLabelService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.sub || request.user?._id?.toString();

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasAccess = await this.whiteLabelService.checkWhiteLabelAccess(userId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'White Label Solution requires Premium Platinum subscription'
      );
    }

    return true;
  }
}

