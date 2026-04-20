import {
  Body,
  Controller,
  Get,
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
import { GroupIdParamDto } from '../groups/dto/group-id-param.dto.js';
import { DailyPromptsService } from './daily-prompts.service.js';
import { SetDailyPromptAnswerDto } from './dto/set-daily-prompt-answer.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

@Controller('groups/:groupId/daily-prompt')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class DailyPromptsController {
  constructor(private readonly dailyPromptsService: DailyPromptsService) {}

  @Get()
  getDailyPrompt(
    @Request() req: ActiveUserRequest,
    @Param() params: GroupIdParamDto,
  ) {
    return this.dailyPromptsService.getDailyPrompt(req.user, params.groupId);
  }

  @Put('answer')
  @HttpCode(HttpStatus.OK)
  setAnswer(
    @Request() req: ActiveUserRequest,
    @Param() params: GroupIdParamDto,
    @Body() dto: SetDailyPromptAnswerDto,
  ) {
    return this.dailyPromptsService.setAnswer(
      req.user,
      params.groupId,
      dto.choiceKey,
    );
  }
}
