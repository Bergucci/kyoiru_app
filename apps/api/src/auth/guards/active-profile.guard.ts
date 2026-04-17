import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ProfileStatus } from '@prisma/client';
import type { User } from '@prisma/client';

/**
 * JwtAuthGuard の後段で使用する。
 * profile_status が active でないユーザー (pending / deactivated) を 403 で弾く。
 *
 * 使い方:
 *   @UseGuards(JwtAuthGuard, ActiveProfileGuard)
 *
 * 適用先: ホーム系・友達・グループなど、プロフィール設定完了後にのみ
 * 利用できる全エンドポイント。
 */
@Injectable()
export class ActiveProfileGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user: User }>();
    if (!req.user || req.user.profileStatus !== ProfileStatus.active) {
      throw new ForbiddenException('Profile setup required');
    }
    return true;
  }
}
