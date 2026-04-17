import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CheckinTemplate,
  MonitoringAlertDeliveryPhase,
  MonitoringRelationshipStatus,
  Prisma,
  type User,
} from '@prisma/client';
import { getCurrentBusinessDateJst } from '../me/me.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MonitoringPlanGateService } from '../billing/monitoring-plan-gate.service.js';
import type {
  MonitoringAlertCandidate,
  MonitoringCurrentStage,
  MonitoringDashboardItem,
} from './monitoring-alert.types.js';
import {
  getPreviousBusinessDateJst,
  resolveMonitoringAlertRuns,
  resolveMonitoringCurrentStage,
} from './monitoring-alert.utils.js';

interface TargetCheckinSnapshot {
  lastCheckedInAt: Date | null;
  hasCurrentBusinessDayCheckin: boolean;
  hasPreviousBusinessDayCheckin: boolean;
}

@Injectable()
export class MonitoringAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gate: MonitoringPlanGateService,
  ) {}

  async reserveDueNotifications(
    now: Date = new Date(),
  ): Promise<MonitoringAlertCandidate[]> {
    const runs = resolveMonitoringAlertRuns(now);
    const deliveries: MonitoringAlertCandidate[] = [];

    for (const run of runs) {
      const reserved = await this.reserveRun(now, run);
      deliveries.push(...reserved);
    }

    return deliveries;
  }

  async getDashboard(
    watcher: User,
    now: Date = new Date(),
  ): Promise<MonitoringDashboardItem[]> {
    const rows = await this.prisma.monitoringRelationship.findMany({
      where: {
        watcherUserId: watcher.id,
      },
      select: {
        id: true,
        watcherUserId: true,
        targetUserId: true,
        status: true,
        requestedAt: true,
        target: {
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        settings: {
          select: {
            checkinFrequency: true,
            checkinTemplate: true,
          },
        },
        emergencyContact: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    const isWatcherGateActive = await this.gate.canUseMonitoringFeatures(watcher.id);
    const checkinSnapshots = await this.loadTargetCheckinSnapshots(
      rows.map((row) => row.targetUserId),
      now,
    );

    return rows.map((row) => {
      const snapshot = checkinSnapshots.get(row.targetUserId) ?? {
        lastCheckedInAt: null,
        hasCurrentBusinessDayCheckin: false,
        hasPreviousBusinessDayCheckin: false,
      };

      const isEffectivelyActive =
        row.status === MonitoringRelationshipStatus.active && isWatcherGateActive;
      const stage = isEffectivelyActive
        ? resolveMonitoringCurrentStage({
            now,
            hasCurrentBusinessDayCheckin: snapshot.hasCurrentBusinessDayCheckin,
            hasPreviousBusinessDayCheckin: snapshot.hasPreviousBusinessDayCheckin,
          })
        : this.getNoneStage();

      return {
        relationshipId: row.id,
        target: row.target,
        status: row.status,
        isEffectivelyActive,
        lastCheckedInAt: snapshot.lastCheckedInAt,
        currentStage: stage.currentStage,
        hasEmergencyContact: row.emergencyContact !== null,
        checkinFrequency: row.settings?.checkinFrequency ?? 1,
        checkinTemplate: row.settings?.checkinTemplate ?? CheckinTemplate.morning,
        canOpenLocationCheck: stage.canOpenLocationCheck,
      };
    });
  }

  async getFinalStageEmergencyContact(
    watcher: User,
    relationshipId: string,
    now: Date = new Date(),
  ) {
    const relationship = await this.prisma.monitoringRelationship.findFirst({
      where: {
        id: relationshipId,
        watcherUserId: watcher.id,
      },
      select: {
        id: true,
        targetUserId: true,
        status: true,
        emergencyContact: {
          select: {
            name: true,
            phoneNumber: true,
            relationship: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!relationship) {
      throw new NotFoundException('Monitoring relationship not found');
    }

    const isEffectivelyActive =
      relationship.status === MonitoringRelationshipStatus.active &&
      (await this.gate.canUseMonitoringFeatures(watcher.id));
    if (!isEffectivelyActive) {
      throw new NotFoundException('Final-stage emergency contact not found');
    }

    const checkinSnapshots = await this.loadTargetCheckinSnapshots(
      [relationship.targetUserId],
      now,
    );
    const snapshot = checkinSnapshots.get(relationship.targetUserId) ?? {
      lastCheckedInAt: null,
      hasCurrentBusinessDayCheckin: false,
      hasPreviousBusinessDayCheckin: false,
    };
    const stage = resolveMonitoringCurrentStage({
      now,
      hasCurrentBusinessDayCheckin: snapshot.hasCurrentBusinessDayCheckin,
      hasPreviousBusinessDayCheckin: snapshot.hasPreviousBusinessDayCheckin,
    });

    if (stage.currentStage !== MonitoringAlertDeliveryPhase.monitor_stage_3) {
      throw new NotFoundException('Final-stage emergency contact not found');
    }

    if (!relationship.emergencyContact) {
      throw new NotFoundException('Final-stage emergency contact not found');
    }

    await this.prisma.monitoringEmergencyContactView.create({
      data: {
        monitoringRelationshipId: relationship.id,
        watcherUserId: watcher.id,
        targetUserId: relationship.targetUserId,
        viewedAt: now,
      },
    });

    return {
      monitoringRelationshipId: relationship.id,
      currentStage: stage.currentStage,
      canOpenLocationCheck: stage.canOpenLocationCheck,
      emergencyContact: relationship.emergencyContact,
    };
  }

  private async reserveRun(
    sentAt: Date,
    run: {
      phase: MonitoringAlertDeliveryPhase;
      businessDateJst: string;
    },
  ): Promise<MonitoringAlertCandidate[]> {
    const [relationships, existingDeliveries] = await Promise.all([
      this.prisma.monitoringRelationship.findMany({
        where: {
          status: MonitoringRelationshipStatus.active,
        },
        select: {
          id: true,
          watcherUserId: true,
          targetUserId: true,
          target: {
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
      }),
      this.prisma.monitoringAlertDelivery.findMany({
        where: {
          businessDateJst: run.businessDateJst,
          phase: run.phase,
        },
        select: {
          monitoringRelationshipId: true,
        },
      }),
    ]);

    const watcherGateMap = await this.buildWatcherGateMap(
      relationships.map((relationship) => relationship.watcherUserId),
    );
    const existingRelationshipIds = new Set(
      existingDeliveries.map((delivery) => delivery.monitoringRelationshipId),
    );

    const candidates = relationships
      .filter(
        (relationship) =>
          watcherGateMap.get(relationship.watcherUserId) === true &&
          relationship.target.dailyCheckins.length === 0 &&
          !existingRelationshipIds.has(relationship.id),
      )
      .map<MonitoringAlertCandidate>((relationship) => ({
        relationshipId: relationship.id,
        watcherUserId: relationship.watcherUserId,
        targetUserId: relationship.targetUserId,
        targetDisplayName: relationship.target.displayName,
        businessDateJst: run.businessDateJst,
        phase: run.phase,
        sentAt,
        canOpenLocationCheck:
          run.phase !== MonitoringAlertDeliveryPhase.monitor_stage_1,
      }));

    const reserved: MonitoringAlertCandidate[] = [];
    for (const candidate of candidates) {
      try {
        await this.prisma.monitoringAlertDelivery.create({
          data: {
            monitoringRelationshipId: candidate.relationshipId,
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

  private async buildWatcherGateMap(
    watcherUserIds: string[],
  ): Promise<Map<string, boolean>> {
    const uniqueWatcherUserIds = [...new Set(watcherUserIds)];
    const entries = await Promise.all(
      uniqueWatcherUserIds.map(async (watcherUserId) => [
        watcherUserId,
        await this.gate.canUseMonitoringFeatures(watcherUserId),
      ] as const),
    );
    return new Map(entries);
  }

  private async loadTargetCheckinSnapshots(
    targetUserIds: string[],
    now: Date,
  ): Promise<Map<string, TargetCheckinSnapshot>> {
    const uniqueTargetUserIds = [...new Set(targetUserIds)];
    const snapshots = new Map<string, TargetCheckinSnapshot>();

    if (uniqueTargetUserIds.length === 0) {
      return snapshots;
    }

    const currentBusinessDateJst = getCurrentBusinessDateJst(now);
    const previousBusinessDateJst = getPreviousBusinessDateJst(now);

    const [lastCheckins, stageCheckins] = await Promise.all([
      this.prisma.dailyCheckin.groupBy({
        by: ['userId'],
        where: {
          userId: {
            in: uniqueTargetUserIds,
          },
        },
        _max: {
          checkedInAt: true,
        },
      }),
      this.prisma.dailyCheckin.findMany({
        where: {
          userId: {
            in: uniqueTargetUserIds,
          },
          businessDateJst: {
            in: [currentBusinessDateJst, previousBusinessDateJst],
          },
        },
        select: {
          userId: true,
          businessDateJst: true,
        },
      }),
    ]);

    for (const userId of uniqueTargetUserIds) {
      snapshots.set(userId, {
        lastCheckedInAt: null,
        hasCurrentBusinessDayCheckin: false,
        hasPreviousBusinessDayCheckin: false,
      });
    }

    for (const lastCheckin of lastCheckins) {
      const snapshot = snapshots.get(lastCheckin.userId);
      if (!snapshot) {
        continue;
      }
      snapshot.lastCheckedInAt = lastCheckin._max.checkedInAt ?? null;
    }

    for (const checkin of stageCheckins) {
      const snapshot = snapshots.get(checkin.userId);
      if (!snapshot) {
        continue;
      }

      if (checkin.businessDateJst === currentBusinessDateJst) {
        snapshot.hasCurrentBusinessDayCheckin = true;
      }
      if (checkin.businessDateJst === previousBusinessDateJst) {
        snapshot.hasPreviousBusinessDayCheckin = true;
      }
    }

    return snapshots;
  }

  private getNoneStage(): {
    currentStage: MonitoringCurrentStage;
    stageBusinessDateJst: null;
    canOpenLocationCheck: false;
  } {
    return {
      currentStage: 'none',
      stageBusinessDateJst: null,
      canOpenLocationCheck: false,
    };
  }
}
