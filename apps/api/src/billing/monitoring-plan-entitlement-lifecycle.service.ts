import { Injectable } from '@nestjs/common';
import { MonitoringRelationshipStatus, SubscriptionEntitlementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MonitoringPlanEntitlementLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 課金ステータスが変化したときに呼ばれる。
   *
   * 停止条件: nextStatus = expired (grace 終了 / 解約後猶予切れ)
   *   → watcher が持つ active な見守り関係を stopped に移行する。
   *   → 設定テーブル (monitoring_settings / emergency_contacts) は削除しない。
   *   → 再契約しても自動で active に戻さない (手動で再リクエストが必要)。
   *
   * grace → active など有効ステータス内の変化では何もしない。
   */
  async handleTransition(
    userId: string,
    _previousStatus: SubscriptionEntitlementStatus | null,
    nextStatus: SubscriptionEntitlementStatus,
  ): Promise<void> {
    // grace は機能使用可能扱い。expired のみ停止処理を実行する。
    if (nextStatus !== SubscriptionEntitlementStatus.expired) {
      return;
    }

    const now = new Date();
    await this.prisma.monitoringRelationship.updateMany({
      where: {
        watcherUserId: userId,
        status: MonitoringRelationshipStatus.active,
      },
      data: {
        status:    MonitoringRelationshipStatus.stopped,
        stoppedAt: now,
      },
    });
  }
}
