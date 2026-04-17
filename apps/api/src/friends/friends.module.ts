import { Module } from '@nestjs/common';
import { BlocksController } from './blocks.controller.js';
import { FriendInvitesController } from './friend-invites.controller.js';
import { FriendsController } from './friends.controller.js';
import { FriendsService } from './friends.service.js';
import { FriendsSearchRateLimitGuard } from './friends-search-rate-limit.guard.js';
import { FriendsSearchRateLimitService } from './friends-search-rate-limit.service.js';

@Module({
  controllers: [FriendsController, BlocksController, FriendInvitesController],
  providers: [
    FriendsService,
    FriendsSearchRateLimitGuard,
    FriendsSearchRateLimitService,
  ],
})
export class FriendsModule {}
