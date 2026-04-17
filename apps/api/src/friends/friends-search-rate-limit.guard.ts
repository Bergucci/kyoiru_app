import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { FriendsSearchRateLimitService } from './friends-search-rate-limit.service.js';

@Injectable()
export class FriendsSearchRateLimitGuard implements CanActivate {
  constructor(
    private readonly friendsSearchRateLimitService: FriendsSearchRateLimitService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: User }>();
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return true;
    }

    const allowed = this.friendsSearchRateLimitService.consume(currentUserId);
    if (!allowed) {
      throw new HttpException(
        'Too many search requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
