import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ActiveProfileGuard } from '../auth/guards/active-profile.guard.js';
import { MoodStampsService } from './mood-stamps.service.js';
import { MoodStampIdParamDto } from './dto/mood-stamp-id-param.dto.js';
import { SetMoodStampReactionDto } from './dto/set-mood-stamp-reaction.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

@Controller('mood-stamps')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class MoodStampsController {
  constructor(private readonly moodStampsService: MoodStampsService) {}

  @Put(':moodStampId/reactions')
  @HttpCode(HttpStatus.OK)
  setReaction(
    @Request() req: ActiveUserRequest,
    @Param() params: MoodStampIdParamDto,
    @Body() dto: SetMoodStampReactionDto,
  ) {
    return this.moodStampsService.setReaction(
      req.user,
      params.moodStampId,
      dto.reactionType,
    );
  }

  @Delete(':moodStampId/reactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReaction(
    @Request() req: ActiveUserRequest,
    @Param() params: MoodStampIdParamDto,
  ) {
    await this.moodStampsService.deleteReaction(req.user, params.moodStampId);
  }
}
