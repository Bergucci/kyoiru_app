import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccountService } from './account.service.js';
import type { AccountDeletionJobResult } from './account.types.js';

@Injectable()
export class AccountDeletionSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService,
  ) {}

  async runDueTasks(now: Date = new Date()): Promise<AccountDeletionJobResult> {
    const purge24hUsers = await this.run24HourPurge(now);
    const purge30dUsers = await this.run30DayPurge(now);
    const purge180dUsers = await this.run180DayPurge(now);
    const purge7yUsers = await this.run7YearPurge(now);

    return {
      purge24hUsers,
      purge30dUsers,
      purge180dUsers,
      purge7yUsers,
    };
  }

  private async run24HourPurge(now: Date): Promise<string[]> {
    const requests = await this.prisma.accountDeletionRequest.findMany({
      where: {
        purge24hAfter: {
          lte: now,
        },
        purge24hCompletedAt: null,
      },
      select: {
        userId: true,
      },
    });

    for (const request of requests) {
      await this.prisma.$transaction(async (tx) => {
        await tx.pushToken.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        // 位置履歴 / 最終位置 / 通知キューはこの時点では正本未導入のため no-op。
        // 導入後はこの 24h purge に集約する。

        await tx.accountDeletionRequest.update({
          where: {
            userId: request.userId,
          },
          data: {
            purge24hCompletedAt: now,
          },
        });
      });
    }

    return requests.map((request) => request.userId);
  }

  private async run30DayPurge(now: Date): Promise<string[]> {
    const requests = await this.prisma.accountDeletionRequest.findMany({
      where: {
        purge30dAfter: {
          lte: now,
        },
        purge30dCompletedAt: null,
      },
      select: {
        userId: true,
      },
    });

    for (const request of requests) {
      await this.prisma.$transaction(async (tx) => {
        await tx.freeCheckinReminderDelivery.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.dailyMoodStamp.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.dailyCheckin.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.groupMember.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.groupInviteLink.deleteMany({
          where: {
            createdByUserId: request.userId,
          },
        });

        await tx.friendshipRequest.deleteMany({
          where: {
            OR: [
              { senderUserId: request.userId },
              { receiverUserId: request.userId },
            ],
          },
        });

        await tx.friendship.deleteMany({
          where: {
            OR: [
              { userLowId: request.userId },
              { userHighId: request.userId },
            ],
          },
        });

        await tx.monitoringAlertDelivery.deleteMany({
          where: {
            monitoringRelationship: {
              OR: [
                { watcherUserId: request.userId },
                { targetUserId: request.userId },
              ],
            },
          },
        });

        await tx.emergencyContact.deleteMany({
          where: {
            monitoringRelationship: {
              OR: [
                { watcherUserId: request.userId },
                { targetUserId: request.userId },
              ],
            },
          },
        });

        await tx.monitoringSettings.deleteMany({
          where: {
            monitoringRelationship: {
              OR: [
                { watcherUserId: request.userId },
                { targetUserId: request.userId },
              ],
            },
          },
        });

        await tx.monitoringRelationship.deleteMany({
          where: {
            OR: [
              { watcherUserId: request.userId },
              { targetUserId: request.userId },
            ],
          },
        });

        await tx.authIdentity.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.refreshToken.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.pushToken.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.user.update({
          where: {
            id: request.userId,
          },
          data: this.accountService.buildAnonymizedUserData(request.userId, now),
        });

        await tx.accountDeletionRequest.update({
          where: {
            userId: request.userId,
          },
          data: {
            purge30dCompletedAt: now,
          },
        });
      });
    }

    return requests.map((request) => request.userId);
  }

  private async run180DayPurge(now: Date): Promise<string[]> {
    const requests = await this.prisma.accountDeletionRequest.findMany({
      where: {
        purge180dAfter: {
          lte: now,
        },
        purge30dCompletedAt: {
          not: null,
        },
        purge180dCompletedAt: null,
      },
      select: {
        userId: true,
      },
    });

    for (const request of requests) {
      await this.prisma.$transaction(async (tx) => {
        await tx.userBlock.deleteMany({
          where: {
            OR: [
              { blockerUserId: request.userId },
              { blockedUserId: request.userId },
            ],
          },
        });

        await tx.monitoringEmergencyContactView.deleteMany({
          where: {
            OR: [
              { watcherUserId: request.userId },
              { targetUserId: request.userId },
            ],
          },
        });

        await tx.accountDeletionRequest.update({
          where: {
            userId: request.userId,
          },
          data: {
            purge180dCompletedAt: now,
          },
        });
      });
    }

    return requests.map((request) => request.userId);
  }

  private async run7YearPurge(now: Date): Promise<string[]> {
    const requests = await this.prisma.accountDeletionRequest.findMany({
      where: {
        purge7yAfter: {
          lte: now,
        },
        purge180dCompletedAt: {
          not: null,
        },
        purge7yCompletedAt: null,
      },
      select: {
        userId: true,
      },
    });

    for (const request of requests) {
      await this.prisma.$transaction(async (tx) => {
        await tx.revenueCatWebhookEvent.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.userSubscriptionEntitlement.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.accountDeletionRequest.update({
          where: {
            userId: request.userId,
          },
          data: {
            purge7yCompletedAt: now,
          },
        });
      });
    }

    return requests.map((request) => request.userId);
  }
}
