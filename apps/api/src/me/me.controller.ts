import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ActiveProfileGuard } from '../auth/guards/active-profile.guard.js';
import { MeService } from './me.service.js';
import { SetMoodStampDto } from './dto/set-mood-stamp.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

@Controller('me')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Post('checkins/today')
  @HttpCode(HttpStatus.CREATED)
  checkInToday(@Request() req: ActiveUserRequest) {
    return this.meService.checkInToday(req.user);
  }

  @Post('mood-stamp')
  @HttpCode(HttpStatus.CREATED)
  setMoodStamp(
    @Request() req: ActiveUserRequest,
    @Body() dto: SetMoodStampDto,
  ) {
    return this.meService.setMoodStamp(req.user, dto);
  }

  @Delete('mood-stamp')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMoodStamp(@Request() req: ActiveUserRequest) {
    await this.meService.deleteMoodStamp(req.user);
  }

  @Get('checkins/history')
  getCheckinHistory(@Request() req: ActiveUserRequest) {
    return this.meService.getCheckinHistory(req.user);
  }
}
