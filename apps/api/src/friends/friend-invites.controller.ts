import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ActiveProfileGuard } from '../auth/guards/active-profile.guard.js';
import { FriendsService } from './friends.service.js';
import { TokenParamDto } from './dto/token-param.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

@Controller('friend-invites')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class FriendInvitesController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get(':token')
  previewInvite(
    @Request() req: ActiveUserRequest,
    @Param() params: TokenParamDto,
  ) {
    return this.friendsService.previewFriendInvite(req.user, params.token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvite(
    @Request() req: ActiveUserRequest,
    @Param() params: TokenParamDto,
  ) {
    return this.friendsService.acceptFriendInvite(req.user, params.token);
  }
}
