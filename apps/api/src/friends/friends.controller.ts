import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ActiveProfileGuard } from '../auth/guards/active-profile.guard.js';
import { FriendsService } from './friends.service.js';
import { SearchUserDto } from './dto/search-user.dto.js';
import { SendRequestDto } from './dto/send-request.dto.js';
import { FriendsSearchRateLimitGuard } from './friends-search-rate-limit.guard.js';
import { RequestIdParamDto } from './dto/request-id-param.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

/**
 * 友達導線の入口。
 * 全エンドポイントに JwtAuthGuard + ActiveProfileGuard を適用する。
 * pending ユーザーは ActiveProfileGuard で 403 になる。
 */
@Controller('friends')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /**
   * GET /friends/search?userId=<query>
   *
   * userId の前方一致でユーザーを検索する。
   * 検索結果: { userId, displayName, avatarUrl }[] (最大 20 件)
   * 除外: self / private / block 関係 / 非 active
   */
  @Get('search')
  @UseGuards(FriendsSearchRateLimitGuard)
  search(
    @Request() req: ActiveUserRequest,
    @Query() dto: SearchUserDto,
  ) {
    return this.friendsService.searchUsers(req.user, dto);
  }

  /**
   * POST /friends/requests
   *
   * 友達申請を送信する。
   * 送信前に block / already_friends / already_pending /
   * 1日30件 / 拒否後30日 を判定する。
   * 成功時: { requestId, status: 'pending' }
   */
  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  sendRequest(
    @Request() req: ActiveUserRequest,
    @Body() dto: SendRequestDto,
  ) {
    return this.friendsService.sendRequest(req.user, dto);
  }

  @Get()
  listFriends(@Request() req: ActiveUserRequest) {
    return this.friendsService.listFriends(req.user);
  }

  @Get('requests/incoming')
  getIncomingRequests(@Request() req: ActiveUserRequest) {
    return this.friendsService.getIncomingPendingRequests(req.user);
  }

  @Get('requests/outgoing')
  getOutgoingRequests(@Request() req: ActiveUserRequest) {
    return this.friendsService.getOutgoingPendingRequests(req.user);
  }

  @Post('requests/:requestId/accept')
  @HttpCode(HttpStatus.OK)
  acceptRequest(
    @Request() req: ActiveUserRequest,
    @Param() params: RequestIdParamDto,
  ) {
    return this.friendsService.acceptRequest(req.user, params.requestId);
  }

  @Post('requests/:requestId/reject')
  @HttpCode(HttpStatus.OK)
  rejectRequest(
    @Request() req: ActiveUserRequest,
    @Param() params: RequestIdParamDto,
  ) {
    return this.friendsService.rejectRequest(req.user, params.requestId);
  }

  @Post('requests/:requestId/reject-revert')
  @HttpCode(HttpStatus.OK)
  rejectRevertRequest(
    @Request() req: ActiveUserRequest,
    @Param() params: RequestIdParamDto,
  ) {
    return this.friendsService.revertRejectedRequest(req.user, params.requestId);
  }

  @Post('requests/:requestId/cancel')
  @HttpCode(HttpStatus.OK)
  cancelRequest(
    @Request() req: ActiveUserRequest,
    @Param() params: RequestIdParamDto,
  ) {
    return this.friendsService.cancelRequest(req.user, params.requestId);
  }

  @Post('invite-links')
  @HttpCode(HttpStatus.CREATED)
  issueInviteLink(@Request() req: ActiveUserRequest) {
    return this.friendsService.issueFriendInviteLink(req.user);
  }

  @Post('invite-links/reissue')
  @HttpCode(HttpStatus.CREATED)
  reissueInviteLink(@Request() req: ActiveUserRequest) {
    return this.friendsService.reissueFriendInviteLink(req.user);
  }
}
