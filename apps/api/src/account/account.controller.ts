import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AccountService } from './account.service.js';

interface AuthRequest extends FastifyRequest {
  user: User;
}

@Controller()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  deleteAccount(@Request() req: AuthRequest) {
    return this.accountService.deleteAccount(req.user);
  }
}
