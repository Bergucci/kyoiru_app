import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ContactService } from './contact.service.js';
import { SendContactDto } from './contact.dto.js';

interface AuthRequest extends FastifyRequest {
  user: User;
}

@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('contact')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendContact(
    @Body() dto: SendContactDto,
    @Request() req: AuthRequest,
  ) {
    await this.contactService.sendContactEmail(dto, req.user.displayName);
    return { message: 'お問い合わせを受け付けました。内容を確認の上、ご連絡いたします。' };
  }
}
