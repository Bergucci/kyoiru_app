import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ProfileStatus,
  type FreeCheckinReminderPhase,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type FreeUnreactedNotificationCandidate,
} from './free-unreacted-notification.types.js';
import {
  resolveFreeUnreactedNotificationRuns,
  type FreeUnreactedNotificationRun,
} from './free-unreacted-notification.utils.js';

@Injectable()
export class FreeUnreactedNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async reserveDueNotifications(
    now: Date = new Date(),
  ): Promise<FreeUnreactedNotificationCandidate[]> {
    const runs = resolveFreeUnreactedNotificationRuns(now);
    const deliveries: FreeUnreactedNotificationCandidate[] = [];

    for (const run of runs) {
      const reserved = await this.reserveRun(now, run);
      deliveries.push(...reserved);
    }

    return deliveries;
  }

  private async reserveRun(
    sentAt: Date,
    run: FreeUnreactedNotificationRun,
  ): Promise<FreeUnreactedNotificationCandidate[]> {
    const [groups, existingDeliveries] = await Promise.all([
      this.prisma.group.findMany({
        where: {
          notificationLevel: {
            in: run.notificationLevels,
          },
        },
        select: {
          id: true,
          name: true,
          notificationLevel: true,
          members: {
            where: {
              user: {
                profileStatus: ProfileStatus.active,
              },
            },
            select: {
              userId: true,
              user: {
                select: {
                  displayName: true,
                  dailyCheckins: {
                    where: {
                      businessDateJst: run.businessDateJst,
                    },
                    select: {
                      id: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.freeCheckinReminderDelivery.findMany({
        where: {
          businessDateJst: run.businessDateJst,
          phase: run.phase,
        },
        select: {
          groupId: true,
          userId: true,
        },
      }),
    ]);

    const existingKeys = new Set(
      existingDeliveries.map((delivery) =>
        this.toDeliveryScopeKey(
          delivery.groupId,
          delivery.userId,
          run.businessDateJst,
          run.phase,
        ),
      ),
    );

    const candidates = groups.flatMap((group) =>
      group.members
        .filter((member) => member.user.dailyCheckins.length === 0)
        .map<FreeUnreactedNotificationCandidate>((member) => ({
          groupId: group.id,
          groupName: group.name,
          userId: member.userId,
          userDisplayName: member.user.displayName,
          businessDateJst: run.businessDateJst,
          phase: run.phase,
          notificationLevel: group.notificationLevel,
          sentAt,
        }))
        .filter(
          (candidate) =>
            !existingKeys.has(
              this.toDeliveryScopeKey(
                candidate.groupId,
                candidate.userId,
                candidate.businessDateJst,
                candidate.phase,
              ),
            ),
        ),
    );

    const reserved: FreeUnreactedNotificationCandidate[] = [];
    for (const candidate of candidates) {
      try {
        await this.prisma.freeCheckinReminderDelivery.create({
          data: {
            groupId: candidate.groupId,
            userId: candidate.userId,
            businessDateJst: candidate.businessDateJst,
            phase: candidate.phase,
            sentAt: candidate.sentAt,
          },
        });
        reserved.push(candidate);
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }

    return reserved;
  }

  private toDeliveryScopeKey(
    groupId: string,
    userId: string,
    businessDateJst: string,
    phase: FreeCheckinReminderPhase,
  ): string {
    return `${groupId}:${userId}:${businessDateJst}:${phase}`;
  }
}
