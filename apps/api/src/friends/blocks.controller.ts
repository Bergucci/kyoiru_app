import {
  Body,
  Controller,
  Delete,
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
import { BlockUserDto } from './dto/block-user.dto.js';
import { BlockIdParamDto } from './dto/block-id-param.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

@Controller('blocks')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class BlocksController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  listBlocks(@Request() req: ActiveUserRequest) {
    return this.friendsService.listBlocks(req.user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  blockUser(
    @Request() req: ActiveUserRequest,
    @Body() dto: BlockUserDto,
  ) {
    return this.friendsService.blockUser(req.user, dto);
  }

  @Delete(':blockId')
  @HttpCode(HttpStatus.OK)
  unblockUser(
    @Request() req: ActiveUserRequest,
    @Param() params: BlockIdParamDto,
  ) {
    return this.friendsService.unblockUser(req.user, params.blockId);
  }
}
