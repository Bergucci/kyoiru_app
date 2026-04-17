import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  SubscriptionEntitlementStatus,
  type User,
  type UserSubscriptionEntitlement,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MonitoringPlanEntitlementLifecycleService } from './monitoring-plan-entitlement-lifecycle.service.js';
import type {
  BillingEntitlementResponseStatus,
  BillingEntitlementSummary,
  RevenueCatWebhookResult,
} from './billing.types.js';

const DEFAULT_MONITORING_ENTITLEMENT_KEY = 'monitoring_plan';
const DEFAULT_MONITORING_PLAN_NAME = '見守りプラン';
const REVENUECAT_INTERNAL_USER_ID_PREFIX = 'uuid:';
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PrismaTx = Prisma.TransactionClient;

interface RevenueCatWebhookPayload {
  api_version?: string;
  event?: RevenueCatWebhookEventPayload;
}

interface RevenueCatWebhookEventPayload {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string | null;
  aliases?: string[] | null;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  event_timestamp_ms?: number | null;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  period_type?: string | null;
  is_trial_conversion?: boolean | null;
  cancellation_reason?: string | null;
  store?: string | null;
  environment?: string | null;
}

interface ResolvedRevenueCatWebhookPayload {
  rawPayload: Prisma.InputJsonValue;
  event: RevenueCatWebhookEventPayload & {
    id: string;
    type: string;
  };
}

@Injectable()
export class BillingService {
  private readonly monitoringEntitlementKey: string;
  private readonly monitoringPlanName: string;
  private readonly webhookAuthorizationHeader: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly lifecycleService: MonitoringPlanEntitlementLifecycleService,
  ) {
    this.monitoringEntitlementKey =
      this.configService.get<string>('REVENUECAT_MONITORING_ENTITLEMENT_KEY') ??
      DEFAULT_MONITORING_ENTITLEMENT_KEY;
    this.monitoringPlanName =
      this.configService.get<string>('REVENUECAT_MONITORING_PLAN_NAME') ??
      DEFAULT_MONITORING_PLAN_NAME;
    this.webhookAuthorizationHeader =
      this.configService.get<string>('REVENUECAT_WEBHOOK_AUTH_HEADER')?.trim() ||
      null;
  }

  async processRevenueCatWebhook(
    payload: unknown,
    authorizationHeader?: string,
  ): Promise<RevenueCatWebhookResult> {
    this.verifyWebhookAuthorization(authorizationHeader);

    const resolvedPayload = this.parseRevenueCatWebhookPayload(payload);
    const event = resolvedPayload.event;
    const eventTimestampAt = this.toDateOrNow(event.event_timestamp_ms);
    const entitlementKey = this.extractTargetEntitlementKey(event);
    const user = await this.resolveUserFromRevenueCatEvent(event);
    const ignoredReason =
      entitlementKey === null
        ? 'entitlement_not_targeted'
        : user === null
          ? 'user_not_found'
          : null;

    return this.prisma.$transaction(async (tx) => {
      const existingWebhookEvent = await tx.revenueCatWebhookEvent.findUnique({
        where: { id: event.id },
        select: { id: true },
      });

      if (existingWebhookEvent) {
        return {
          eventId: event.id,
          status: 'duplicate',
        };
      }

      await tx.revenueCatWebhookEvent.create({
        data: {
          id: event.id,
          userId: user?.id ?? null,
          appUserId: event.app_user_id ?? null,
          eventType: event.type,
          entitlementKey,
          eventTimestampAt,
          environment: event.environment ?? null,
          payload: resolvedPayload.rawPayload,
          processedAt: new Date(),
          ignoredReason,
        },
      });

      if (!entitlementKey || !user) {
        return {
          eventId: event.id,
          status: 'ignored',
          reason: ignoredReason ?? 'ignored',
        };
      }

      const existingEntitlement =
        await tx.userSubscriptionEntitlement.findUnique({
          where: {
            uq_user_subscription_entitlements_user_key: {
              userId: user.id,
              entitlementKey,
            },
          },
        });

      if (
        existingEntitlement &&
        eventTimestampAt.getTime() < existingEntitlement.lastEventTimestampAt.getTime()
      ) {
        await tx.revenueCatWebhookEvent.update({
          where: { id: event.id },
          data: { ignoredReason: 'stale_event' },
        });

        return {
          eventId: event.id,
          status: 'ignored',
          reason: 'stale_event',
        };
      }

      const previousStatus = existingEntitlement?.status ?? null;
      const nextEntitlementData = this.buildEntitlementWriteData(
        existingEntitlement,
        user.id,
        entitlementKey,
        event,
        eventTimestampAt,
      );

      const entitlement = existingEntitlement
        ? await tx.userSubscriptionEntitlement.update({
            where: { id: existingEntitlement.id },
            data: nextEntitlementData.update,
          })
        : await tx.userSubscriptionEntitlement.create({
            data: nextEntitlementData.create,
          });

      if (previousStatus !== entitlement.status) {
        await this.lifecycleService.handleTransition(
          user.id,
          previousStatus,
          entitlement.status,
        );
      }

      return {
        eventId: event.id,
        status: 'processed',
      };
    });
  }

  async getCurrentEntitlement(currentUser: User): Promise<BillingEntitlementSummary> {
    return this.getMonitoringEntitlementByUserId(currentUser.id);
  }

  async getMonitoringEntitlementByUserId(
    userId: string,
  ): Promise<BillingEntitlementSummary> {
    const entitlement = await this.prisma.userSubscriptionEntitlement.findUnique({
      where: {
        uq_user_subscription_entitlements_user_key: {
          userId,
          entitlementKey: this.monitoringEntitlementKey,
        },
      },
    });

    if (!entitlement) {
      return {
        planName: this.monitoringPlanName,
        status: 'inactive',
        currentPeriodExpiresAt: null,
        gracePeriodExpiresAt: null,
        isActiveForFeatures: false,
      };
    }

    const syncedEntitlement = await this.ensureEffectiveStatus(entitlement);
    return this.toEntitlementSummary(syncedEntitlement);
  }

  private async ensureEffectiveStatus(
    entitlement: UserSubscriptionEntitlement,
    now: Date = new Date(),
  ): Promise<UserSubscriptionEntitlement> {
    const effectiveStatus = this.resolveEffectiveStatus(
      entitlement.currentPeriodExpiresAt,
      entitlement.gracePeriodExpiresAt,
      now,
    );

    if (effectiveStatus === entitlement.status) {
      return entitlement;
    }

    const updatedEntitlement = await this.prisma.userSubscriptionEntitlement.update({
      where: { id: entitlement.id },
      data: {
        status: effectiveStatus,
      },
    });

    await this.lifecycleService.handleTransition(
      entitlement.userId,
      entitlement.status,
      effectiveStatus,
    );

    return updatedEntitlement;
  }

  private toEntitlementSummary(
    entitlement: UserSubscriptionEntitlement,
  ): BillingEntitlementSummary {
    const status = entitlement.status satisfies SubscriptionEntitlementStatus;
    return {
      planName: this.monitoringPlanName,
      status,
      currentPeriodExpiresAt: entitlement.currentPeriodExpiresAt,
      gracePeriodExpiresAt: entitlement.gracePeriodExpiresAt,
      isActiveForFeatures:
        status === SubscriptionEntitlementStatus.active ||
        status === SubscriptionEntitlementStatus.grace,
    };
  }

  private verifyWebhookAuthorization(authorizationHeader?: string): void {
    if (
      this.webhookAuthorizationHeader !== null &&
      authorizationHeader !== this.webhookAuthorizationHeader
    ) {
      throw new UnauthorizedException('Invalid RevenueCat webhook authorization');
    }
  }

  private parseRevenueCatWebhookPayload(
    payload: unknown,
  ): ResolvedRevenueCatWebhookPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Invalid RevenueCat webhook payload');
    }

    const candidatePayload = payload as RevenueCatWebhookPayload;
    const event = candidatePayload.event;
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new BadRequestException('Invalid RevenueCat webhook payload');
    }

    if (typeof event.id !== 'string' || event.id.length === 0) {
      throw new BadRequestException('RevenueCat event id is required');
    }
    if (typeof event.type !== 'string' || event.type.length === 0) {
      throw new BadRequestException('RevenueCat event type is required');
    }

    return {
      rawPayload: payload as Prisma.InputJsonValue,
      event: {
        ...event,
        id: event.id,
        type: event.type,
      },
    };
  }

  private extractTargetEntitlementKey(
    event: RevenueCatWebhookEventPayload,
  ): string | null {
    if (event.entitlement_id === this.monitoringEntitlementKey) {
      return this.monitoringEntitlementKey;
    }

    if (event.entitlement_ids?.includes(this.monitoringEntitlementKey)) {
      return this.monitoringEntitlementKey;
    }

    return null;
  }

  private async resolveUserFromRevenueCatEvent(
    event: RevenueCatWebhookEventPayload,
  ): Promise<{ id: string } | null> {
    const candidateUserIds = [
      event.app_user_id,
      event.original_app_user_id ?? undefined,
      ...(event.aliases ?? []),
    ]
      .map((value) => this.parseRevenueCatInternalUserId(value))
      .filter((value): value is string => value !== null);

    if (candidateUserIds.length === 0) {
      return null;
    }

    const uniqueCandidateUserIds = [...new Set(candidateUserIds)];
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: uniqueCandidateUserIds,
        },
      },
      select: {
        id: true,
      },
    });

    const usersById = new Map(users.map((user) => [user.id, user]));
    for (const candidateUserId of uniqueCandidateUserIds) {
      const matchedUser = usersById.get(candidateUserId);
      if (matchedUser) {
        return matchedUser;
      }
    }

    return null;
  }

  private parseRevenueCatInternalUserId(value?: string | null): string | null {
    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }

    // RevenueCat app_user_id は mobile 側で `uuid:<users.id>` に固定する。
    // prefix なし値や public userId は安全側で解決せず ignore する。
    if (!value.startsWith(REVENUECAT_INTERNAL_USER_ID_PREFIX)) {
      return null;
    }

    const internalUserId = value.slice(REVENUECAT_INTERNAL_USER_ID_PREFIX.length);
    return UUID_REGEX.test(internalUserId) ? internalUserId : null;
  }

  private buildEntitlementWriteData(
    existingEntitlement: UserSubscriptionEntitlement | null,
    userId: string,
    entitlementKey: string,
    event: RevenueCatWebhookEventPayload & { id: string; type: string },
    eventTimestampAt: Date,
  ): {
    create: Prisma.UserSubscriptionEntitlementUncheckedCreateInput;
    update: Prisma.UserSubscriptionEntitlementUncheckedUpdateInput;
  } {
    const currentPeriodExpiresAt = this.toDateOrNull(event.expiration_at_ms);
    const gracePeriodExpiresAt = this.toDateOrNull(
      event.grace_period_expiration_at_ms,
    );
    const trialEndsAt =
      event.period_type === 'TRIAL'
        ? currentPeriodExpiresAt
        : existingEntitlement?.trialEndsAt ?? null;
    const hasUsedTrial =
      existingEntitlement?.hasUsedTrial === true ||
      event.period_type === 'TRIAL' ||
      event.is_trial_conversion === true;
    const status = this.resolveStatusFromEvent(
      event,
      currentPeriodExpiresAt,
      gracePeriodExpiresAt,
      eventTimestampAt,
    );

    return {
      create: {
        userId,
        entitlementKey,
        platform: this.normalizePlatform(event.store),
        status,
        currentPeriodExpiresAt,
        gracePeriodExpiresAt,
        trialEndsAt,
        hasUsedTrial,
        sourceAppUserId: event.app_user_id ?? null,
        lastEventId: event.id,
        lastEventType: event.type,
        lastEventTimestampAt: eventTimestampAt,
      },
      update: {
        platform: this.normalizePlatform(event.store),
        status,
        currentPeriodExpiresAt,
        gracePeriodExpiresAt,
        trialEndsAt,
        hasUsedTrial,
        sourceAppUserId: event.app_user_id ?? null,
        lastEventId: event.id,
        lastEventType: event.type,
        lastEventTimestampAt: eventTimestampAt,
      },
    };
  }

  private resolveStatusFromEvent(
    event: RevenueCatWebhookEventPayload & { type: string },
    currentPeriodExpiresAt: Date | null,
    gracePeriodExpiresAt: Date | null,
    now: Date,
  ): SubscriptionEntitlementStatus {
    if (event.type === 'EXPIRATION' || event.type === 'REFUND') {
      return SubscriptionEntitlementStatus.expired;
    }

    if (
      event.type === 'CANCELLATION' &&
      event.cancellation_reason === 'CUSTOMER_SUPPORT'
    ) {
      return SubscriptionEntitlementStatus.expired;
    }

    if (event.type === 'BILLING_ISSUE') {
      if (gracePeriodExpiresAt && gracePeriodExpiresAt.getTime() > now.getTime()) {
        return SubscriptionEntitlementStatus.grace;
      }
      return this.resolveEffectiveStatus(
        currentPeriodExpiresAt,
        gracePeriodExpiresAt,
        now,
      );
    }

    return this.resolveEffectiveStatus(
      currentPeriodExpiresAt,
      gracePeriodExpiresAt,
      now,
    );
  }

  private resolveEffectiveStatus(
    currentPeriodExpiresAt: Date | null,
    gracePeriodExpiresAt: Date | null,
    now: Date,
  ): SubscriptionEntitlementStatus {
    if (gracePeriodExpiresAt && gracePeriodExpiresAt.getTime() > now.getTime()) {
      return SubscriptionEntitlementStatus.grace;
    }

    if (
      currentPeriodExpiresAt &&
      currentPeriodExpiresAt.getTime() > now.getTime()
    ) {
      return SubscriptionEntitlementStatus.active;
    }

    return SubscriptionEntitlementStatus.expired;
  }

  private normalizePlatform(store?: string | null): string {
    return store?.trim().toLowerCase() || 'unknown';
  }

  private toDateOrNow(timestampMs?: number | null): Date {
    return this.toDateOrNull(timestampMs) ?? new Date();
  }

  private toDateOrNull(timestampMs?: number | null): Date | null {
    return typeof timestampMs === 'number' && Number.isFinite(timestampMs)
      ? new Date(timestampMs)
      : null;
  }
}
