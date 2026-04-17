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
import { GroupsService } from './groups.service.js';
import { TokenParamDto } from './dto/token-param.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

@Controller('group-invites')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class GroupInvitesController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get(':token')
  previewInvite(
    @Request() req: ActiveUserRequest,
    @Param() params: TokenParamDto,
  ) {
    return this.groupsService.previewInvite(req.user, params.token);
  }

  @Post(':token/join')
  @HttpCode(HttpStatus.OK)
  joinWithInvite(
    @Request() req: ActiveUserRequest,
    @Param() params: TokenParamDto,
  ) {
    return this.groupsService.joinWithInvite(req.user, params.token);
  }
}
