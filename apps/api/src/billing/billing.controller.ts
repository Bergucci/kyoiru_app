import {
  Body,
  Controller,
  Get,
  Headers,
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
import { BillingService } from './billing.service.js';
import { SubscriptionCopyService } from './subscription-copy.service.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly subscriptionCopyService: SubscriptionCopyService,
  ) {}

  @Post('revenuecat/webhook')
  @HttpCode(HttpStatus.OK)
  handleRevenueCatWebhook(
    @Body() payload: unknown,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    return this.billingService.processRevenueCatWebhook(
      payload,
      authorizationHeader,
    );
  }

  @Get('entitlement')
  @UseGuards(JwtAuthGuard, ActiveProfileGuard)
  getCurrentEntitlement(@Request() req: ActiveUserRequest) {
    return this.billingService.getCurrentEntitlement(req.user);
  }

  @Get('subscription-copy')
  getSubscriptionCopy() {
    return this.subscriptionCopyService.getSubscriptionCopy();
  }
}
