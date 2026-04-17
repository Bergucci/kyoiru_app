import { Injectable } from '@nestjs/common';
import {
  GpsShareMode,
  IdSearchVisibility,
  MonitoringRelationshipStatus,
  ProfileStatus,
} from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DeleteAccountResult } from './account.types.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DAYS_180_MS = 180 * DAY_MS;
const DAYS_365_MS = 365 * DAY_MS;

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async deleteAccount(currentUser: User): Promise<DeleteAccountResult> {
    const now = new Date();
    const purge24hAfter = new Date(now.getTime() + DAY_MS);
    const purge30dAfter = new Date(now.getTime() + 30 * DAY_MS);
    const purge180dAfter = new Date(now.getTime() + DAYS_180_MS);
    const purge7yAfter = new Date(now.getTime() + 7 * DAYS_365_MS);

    const deletionRequest = await this.prisma.$transaction(async (tx) => {
      const request = await tx.accountDeletionRequest.upsert({
        where: {
          userId: currentUser.id,
        },
        create: {
          userId: currentUser.id,
          requestedAt: now,
          immediateDisabledAt: now,
          purge24hAfter,
          purge30dAfter,
          purge180dAfter,
          purge7yAfter,
        },
        update: {},
      });

      await tx.user.update({
        where: {
          id: currentUser.id,
        },
        data: {
          profileStatus: ProfileStatus.deactivated,
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: currentUser.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.pushToken.updateMany({
        where: {
          userId: currentUser.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.monitoringSettings.updateMany({
        where: {
          monitoringRelationship: {
            targetUserId: currentUser.id,
          },
        },
        data: {
          gpsShareMode: GpsShareMode.off,
        },
      });

      await tx.monitoringRelationship.updateMany({
        where: {
          status: {
            in: [
              MonitoringRelationshipStatus.pending,
              MonitoringRelationshipStatus.active,
            ],
          },
          OR: [
            { watcherUserId: currentUser.id },
            { targetUserId: currentUser.id },
          ],
        },
        data: {
          status: MonitoringRelationshipStatus.stopped,
          stoppedAt: now,
        },
      });

      return request;
    });

    return {
      status: 'scheduled',
      requestedAt: deletionRequest.requestedAt,
      loginDisabledAt: deletionRequest.immediateDisabledAt,
      purge24hAfter: deletionRequest.purge24hAfter,
      purge30dAfter: deletionRequest.purge30dAfter,
      purge180dAfter: deletionRequest.purge180dAfter,
      purge7yAfter: deletionRequest.purge7yAfter,
    };
  }

  buildAnonymizedUserData(userId: string, now: Date) {
    return {
      userId: `deleted_${userId.replace(/-/g, '')}`,
      displayName: 'Deleted User',
      avatarUrl: null,
      idSearchVisibility: IdSearchVisibility.private,
      userIdChangedAt: now,
      profileStatus: ProfileStatus.deactivated,
    };
  }
}
