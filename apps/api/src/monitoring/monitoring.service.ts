import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CheckinTemplate,
  GpsShareMode,
  MonitoringRelationshipStatus,
  Prisma,
  ProfileStatus,
} from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MonitoringPlanGateService } from '../billing/monitoring-plan-gate.service.js';
import type { StartMonitoringRequestDto } from './dto/start-monitoring-request.dto.js';
import type { UpdateMonitoringSettingsDto } from './dto/update-monitoring-settings.dto.js';
import type { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto.js';
import type { UpdateCheckinSettingsDto } from './dto/update-checkin-settings.dto.js';

// ── 型 ───────────────────────────────────────────────────

type PrismaTx = Prisma.TransactionClient;

export interface MonitoringUserSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface MonitoringRelationshipSummary {
  id: string;
  counterpart: MonitoringUserSummary;
  /** 自分が watcher なら 'watcher', target なら 'target' */
  role: 'watcher' | 'target';
  status: MonitoringRelationshipStatus;
  requestedAt: Date;
  activatedAt: Date | null;
  /** status = active かつ watcher の課金 gate が有効かどうか */
  isEffectivelyActive: boolean;
}

export interface StartMonitoringResult {
  id: string;
  status: MonitoringRelationshipStatus;
}

export interface MonitoringActionResult {
  id: string;
  status: MonitoringRelationshipStatus;
}

// ── Service ──────────────────────────────────────────────

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gate: MonitoringPlanGateService,
  ) {}

  // ── 見守り開始 ────────────────────────────────────────

  /**
   * watcher が target への見守りリクエストを作成する。
   *
   * チェック順序:
   *   1. 自分自身への開始を拒否 (400)
   *   2. watcher の課金 gate (403)
   *   3. target の存在確認 (404)
   *   4. block 関係 (422) — block 優先
   *   5. 既に pending / active がある (422)
   *   6. 通過 → status = pending で作成 (この時点では active にしない)
   */
  async startRequest(
    watcher: User,
    dto: StartMonitoringRequestDto,
  ): Promise<StartMonitoringResult> {
    // ── 1. 自分自身 ────────────────────────────────────
    if (watcher.userId === dto.targetUserId) {
      throw new BadRequestException('Cannot monitor yourself');
    }

    // ── 2. 課金 gate ───────────────────────────────────
    await this.gate.assertMonitoringFeaturesAvailable(watcher.id);

    // ── 3. target 存在確認 ─────────────────────────────
    const target = await this.prisma.user.findFirst({
      where: {
        userId: dto.targetUserId,
        profileStatus: ProfileStatus.active,
      },
      select: { id: true, userId: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    // ── 4. block 関係 (双方向) ─────────────────────────
    const blockRelation = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerUserId: watcher.id, blockedUserId: target.id },
          { blockerUserId: target.id, blockedUserId: watcher.id },
        ],
      },
    });
    if (blockRelation) {
      throw new UnprocessableEntityException(
        'Cannot start monitoring with a blocked user',
      );
    }

    // ── 5. 重複チェック (pending / active) ─────────────
    const existing = await this.prisma.monitoringRelationship.findFirst({
      where: {
        watcherUserId: watcher.id,
        targetUserId: target.id,
        status: { in: [MonitoringRelationshipStatus.pending, MonitoringRelationshipStatus.active] },
      },
    });
    if (existing) {
      throw new UnprocessableEntityException(
        'Monitoring request already pending or active',
      );
    }

    // ── 6. pending 作成 ────────────────────────────────
    // この時点では active にしない。同意後に active になる。
    try {
      const relation = await this.prisma.monitoringRelationship.create({
        data: {
          watcherUserId: watcher.id,
          targetUserId: target.id,
          status: MonitoringRelationshipStatus.pending,
        },
      });
      return { id: relation.id, status: relation.status };
    } catch (err) {
      // 並行リクエストで部分ユニークインデックス違反
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new UnprocessableEntityException(
          'Monitoring request already pending or active',
        );
      }
      throw err;
    }
  }

  // ── 同意待ち一覧 (target 視点) ────────────────────────

  /**
   * target 本人宛ての pending リクエスト一覧を返す。
   */
  async getIncomingRequests(
    target: User,
  ): Promise<MonitoringRelationshipSummary[]> {
    const rows = await this.prisma.monitoringRelationship.findMany({
      where: {
        targetUserId: target.id,
        status: MonitoringRelationshipStatus.pending,
      },
      include: {
        watcher: { select: { userId: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      counterpart: r.watcher,
      role: 'target' as const,
      status: r.status,
      requestedAt: r.requestedAt,
      activatedAt: r.activatedAt,
      isEffectivelyActive: false, // pending なので常に false
    }));
  }

  // ── 送信済みリクエスト一覧 (watcher 視点) ─────────────

  /**
   * watcher 本人が送った pending リクエスト一覧を返す。
   */
  async getOutgoingRequests(
    watcher: User,
  ): Promise<MonitoringRelationshipSummary[]> {
    const rows = await this.prisma.monitoringRelationship.findMany({
      where: {
        watcherUserId: watcher.id,
        status: MonitoringRelationshipStatus.pending,
      },
      include: {
        target: { select: { userId: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      counterpart: r.target,
      role: 'watcher' as const,
      status: r.status,
      requestedAt: r.requestedAt,
      activatedAt: r.activatedAt,
      isEffectivelyActive: false, // pending なので常に false
    }));
  }

  // ── 同意 ─────────────────────────────────────────────

  /**
   * target が pending リクエストに同意する。
   * 同意時点でのみ status = active になる。
   * watcher の課金状態が有効でも、この同意前は active 扱いにしない。
   */
  async approveRequest(
    target: User,
    id: string,
  ): Promise<MonitoringActionResult> {
    return this.prisma.$transaction(async (tx) => {
      const relation = await this.getRelationForTarget(tx, target.id, id);

      if (relation.status !== MonitoringRelationshipStatus.pending) {
        throw new ConflictException('Monitoring request is not pending');
      }

      // block 確認 (同意時点でも block があれば不可)
      const blockRelation = await tx.userBlock.findFirst({
        where: {
          OR: [
            { blockerUserId: target.id, blockedUserId: relation.watcherUserId },
            { blockerUserId: relation.watcherUserId, blockedUserId: target.id },
          ],
        },
      });
      if (blockRelation) {
        throw new ForbiddenException('Cannot approve monitoring with a blocked user');
      }

      const now = new Date();
      const updated = await tx.monitoringRelationship.updateMany({
        where: {
          id,
          targetUserId: target.id,
          status: MonitoringRelationshipStatus.pending,
        },
        data: {
          status: MonitoringRelationshipStatus.active,
          respondedAt: now,
          activatedAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Monitoring request is not pending');
      }

      // active 化と同時に初期設定レコードを生成する (初期値は schema のデフォルト値)
      await tx.monitoringSettings.upsert({
        where:  { monitoringRelationshipId: id },
        create: { monitoringRelationshipId: id },
        update: {},
      });

      return { id, status: MonitoringRelationshipStatus.active };
    });
  }

  // ── 拒否 ─────────────────────────────────────────────

  /**
   * target が pending リクエストを拒否する。
   */
  async rejectRequest(
    target: User,
    id: string,
  ): Promise<MonitoringActionResult> {
    return this.prisma.$transaction(async (tx) => {
      const relation = await this.getRelationForTarget(tx, target.id, id);

      if (relation.status !== MonitoringRelationshipStatus.pending) {
        throw new ConflictException('Monitoring request is not pending');
      }

      const now = new Date();
      const updated = await tx.monitoringRelationship.updateMany({
        where: {
          id,
          targetUserId: target.id,
          status: MonitoringRelationshipStatus.pending,
        },
        data: {
          status: MonitoringRelationshipStatus.rejected,
          respondedAt: now,
          rejectedAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Monitoring request is not pending');
      }

      return { id, status: MonitoringRelationshipStatus.rejected };
    });
  }

  // ── 取消 (watcher 側) ──────────────────────────────────

  /**
   * watcher が自分の pending リクエストを取消する。
   */
  async cancelRequest(
    watcher: User,
    id: string,
  ): Promise<MonitoringActionResult> {
    return this.prisma.$transaction(async (tx) => {
      const relation = await this.getRelationForWatcher(tx, watcher.id, id);

      if (relation.status !== MonitoringRelationshipStatus.pending) {
        throw new ConflictException('Monitoring request is not pending');
      }

      const now = new Date();
      const updated = await tx.monitoringRelationship.updateMany({
        where: {
          id,
          watcherUserId: watcher.id,
          status: MonitoringRelationshipStatus.pending,
        },
        data: {
          status: MonitoringRelationshipStatus.cancelled,
          cancelledAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Monitoring request is not pending');
      }

      return { id, status: MonitoringRelationshipStatus.cancelled };
    });
  }

  // ── 同意撤回 (target 側) ──────────────────────────────

  /**
   * target が active な見守りを撤回する。
   * 撤回後は即停止扱い。watcher の課金が有効でも自動再開しない。
   */
  async revokeConsent(
    target: User,
    id: string,
  ): Promise<MonitoringActionResult> {
    return this.prisma.$transaction(async (tx) => {
      const relation = await this.getRelationForTarget(tx, target.id, id);

      if (relation.status !== MonitoringRelationshipStatus.active) {
        throw new ConflictException('Monitoring relationship is not active');
      }

      const now = new Date();
      const updated = await tx.monitoringRelationship.updateMany({
        where: {
          id,
          targetUserId: target.id,
          status: MonitoringRelationshipStatus.active,
        },
        data: {
          status: MonitoringRelationshipStatus.revoked,
          revokedAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Monitoring relationship is not active');
      }

      return { id, status: MonitoringRelationshipStatus.revoked };
    });
  }

  // ── 状態取得 (単体) ───────────────────────────────────

  /**
   * 自分に関係する monitoring_relationship を 1 件取得する。
   * watcher / target どちらでも取得可。無関係なレコードは 404。
   */
  async getRelationship(
    currentUser: User,
    id: string,
  ): Promise<MonitoringRelationshipSummary> {
    const relation = await this.prisma.monitoringRelationship.findFirst({
      where: {
        id,
        OR: [
          { watcherUserId: currentUser.id },
          { targetUserId: currentUser.id },
        ],
      },
      include: {
        watcher: { select: { userId: true, displayName: true, avatarUrl: true } },
        target:  { select: { userId: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!relation) {
      throw new NotFoundException('Monitoring relationship not found');
    }

    // active の場合は watcher の課金 gate を確認して isEffectivelyActive を設定する
    let watcherGateMap: Map<string, boolean> | undefined;
    if (relation.status === MonitoringRelationshipStatus.active) {
      const can = await this.gate.canUseMonitoringFeatures(relation.watcherUserId);
      watcherGateMap = new Map([[relation.watcherUserId, can]]);
    }

    return this.toSummary(relation, currentUser.id, watcherGateMap);
  }

  // ── 状態取得 (一覧) ───────────────────────────────────

  /**
   * 自分に関係する全 monitoring_relationship を返す。
   * watcher / target 双方の関係を含む。
   */
  async listRelationships(
    currentUser: User,
  ): Promise<MonitoringRelationshipSummary[]> {
    const rows = await this.prisma.monitoringRelationship.findMany({
      where: {
        OR: [
          { watcherUserId: currentUser.id },
          { targetUserId: currentUser.id },
        ],
      },
      include: {
        watcher: { select: { userId: true, displayName: true, avatarUrl: true } },
        target:  { select: { userId: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    // active 判定は個別に gate を呼ぶとN+1になるため、
    // watcher ユニーク ID 群でまとめて gate を確認する
    const activeRows = rows.filter(
      (r) => r.status === MonitoringRelationshipStatus.active,
    );
    const uniqueWatcherIds = [...new Set(activeRows.map((r) => r.watcherUserId))];

    const watcherGateMap = new Map<string, boolean>();
    await Promise.all(
      uniqueWatcherIds.map(async (watcherId) => {
        const can = await this.gate.canUseMonitoringFeatures(watcherId);
        watcherGateMap.set(watcherId, can);
      }),
    );

    return rows.map((r) => this.toSummary(r, currentUser.id, watcherGateMap));
  }

  // ── block 発生時の停止フック ──────────────────────────

  /**
   * userAId ↔ userBId 間で block が発生したとき、
   * pending / active の見守り関係を stopped に移行する。
   *
   * FriendsService の blockUser トランザクション内から呼ばれる。
   * tx を受け取ることで呼び出し元トランザクションに参加する。
   */
  async stopForBlockTx(
    tx: PrismaTx,
    userAId: string,
    userBId: string,
  ): Promise<void> {
    const now = new Date();
    await tx.monitoringRelationship.updateMany({
      where: {
        status: { in: [MonitoringRelationshipStatus.pending, MonitoringRelationshipStatus.active] },
        OR: [
          { watcherUserId: userAId, targetUserId: userBId },
          { watcherUserId: userBId, targetUserId: userAId },
        ],
      },
      data: {
        status: MonitoringRelationshipStatus.stopped,
        stoppedAt: now,
      },
    });
  }

  // ── 課金切れ時の停止フック ────────────────────────────

  /**
   * watcher の課金が expired になったとき、
   * その watcher が持つ active な見守り関係を stopped に移行する。
   *
   * MonitoringPlanEntitlementLifecycleService から呼ばれる。
   * 設定テーブル・緊急連絡先は削除しない。
   * 再契約時に自動 active 化しない (手動で再リクエスト or 再設定が必要)。
   */
  async stopActiveRelationshipsForExpiredBilling(watcherUserId: string): Promise<void> {
    const now = new Date();
    await this.prisma.monitoringRelationship.updateMany({
      where: {
        watcherUserId,
        status: MonitoringRelationshipStatus.active,
      },
      data: {
        status: MonitoringRelationshipStatus.stopped,
        stoppedAt: now,
      },
    });
  }

  // ── GPS 共有設定 ──────────────────────────────────────

  /**
   * GPS 共有設定を取得する。
   * watcher / target どちらでも取得可。stopped 後も取得可。
   */
  async getMonitoringSettings(currentUser: User, id: string) {
    const relation = await this.assertParticipant(currentUser.id, id);

    // settings が未作成の場合はデフォルト値で返す (active 化前の古いデータ対応)
    const settings = await this.prisma.monitoringSettings.findUnique({
      where: { monitoringRelationshipId: id },
      select: { gpsShareMode: true, updatedAt: true },
    });

    return {
      monitoringRelationshipId: id,
      status: relation.status,
      gpsShareMode: settings?.gpsShareMode ?? GpsShareMode.on_overdue,
      updatedAt: settings?.updatedAt ?? null,
    };
  }

  /**
   * GPS 共有設定を更新する。
   * target のみ更新可。active 状態のみ許可。
   */
  async updateMonitoringSettings(
    currentUser: User,
    id: string,
    dto: UpdateMonitoringSettingsDto,
  ) {
    const relation = await this.assertParticipant(currentUser.id, id);
    this.assertTargetOnly(relation, currentUser.id, 'GPS 共有設定');
    this.assertActiveRelation(relation);

    const settings = await this.prisma.monitoringSettings.upsert({
      where:  { monitoringRelationshipId: id },
      create: { monitoringRelationshipId: id, gpsShareMode: dto.gpsShareMode },
      update: { gpsShareMode: dto.gpsShareMode },
      select: { gpsShareMode: true, updatedAt: true },
    });

    return {
      monitoringRelationshipId: id,
      gpsShareMode: settings.gpsShareMode,
      updatedAt: settings.updatedAt,
    };
  }

  // ── 緊急連絡先 ────────────────────────────────────────

  /**
   * 緊急連絡先を取得する。
   * target 本人のみ取得可。watcher は 403。stopped 後も target は取得可。
   *
   * 仕様: 緊急連絡先は平常時非表示。watcher への表示は将来の段階通知
   * Step (最終段階のみ) で別途実装する。ここでは target 限定とする。
   */
  async getEmergencyContact(currentUser: User, id: string) {
    const relation = await this.assertParticipant(currentUser.id, id);
    this.assertTargetOnly(relation, currentUser.id, '緊急連絡先');

    const contact = await this.prisma.emergencyContact.findUnique({
      where: { monitoringRelationshipId: id },
      select: { name: true, phoneNumber: true, relationship: true, updatedAt: true },
    });

    return {
      monitoringRelationshipId: id,
      emergencyContact: contact ?? null,
    };
  }

  /**
   * 緊急連絡先を作成 / 更新する (upsert)。
   * target のみ更新可。active 状態のみ許可。
   * 1 件のみ保持する (DB ユニーク制約で担保)。
   */
  async upsertEmergencyContact(
    currentUser: User,
    id: string,
    dto: UpdateEmergencyContactDto,
  ) {
    const relation = await this.assertParticipant(currentUser.id, id);
    this.assertTargetOnly(relation, currentUser.id, '緊急連絡先');
    this.assertActiveRelation(relation);

    const contact = await this.prisma.emergencyContact.upsert({
      where:  { monitoringRelationshipId: id },
      create: {
        monitoringRelationshipId: id,
        name:         dto.name,
        phoneNumber:  dto.phoneNumber,
        relationship: dto.relationship ?? null,
      },
      update: {
        name:         dto.name,
        phoneNumber:  dto.phoneNumber,
        relationship: dto.relationship ?? null,
      },
      select: { name: true, phoneNumber: true, relationship: true, updatedAt: true },
    });

    return {
      monitoringRelationshipId: id,
      emergencyContact: contact,
    };
  }

  // ── チェックイン設定 ──────────────────────────────────

  /**
   * チェックイン設定を取得する。
   * watcher / target どちらでも取得可。stopped 後も取得可。
   */
  async getCheckinSettings(currentUser: User, id: string) {
    const relation = await this.assertParticipant(currentUser.id, id);

    const settings = await this.prisma.monitoringSettings.findUnique({
      where: { monitoringRelationshipId: id },
      select: { checkinFrequency: true, checkinTemplate: true, updatedAt: true },
    });

    return {
      monitoringRelationshipId: id,
      status: relation.status,
      checkinFrequency: settings?.checkinFrequency ?? 1,
      checkinTemplate:  settings?.checkinTemplate  ?? CheckinTemplate.morning,
      updatedAt: settings?.updatedAt ?? null,
    };
  }

  /**
   * チェックイン設定を更新する。
   * target のみ更新可。active 状態のみ許可。
   * frequency と template の整合性チェック:
   *   frequency=1 → template は morning のみ許可
   *   frequency=2 → template は morning_evening のみ許可
   *   frequency=3 → template は morning_noon_evening のみ許可
   */
  async updateCheckinSettings(
    currentUser: User,
    id: string,
    dto: UpdateCheckinSettingsDto,
  ) {
    const relation = await this.assertParticipant(currentUser.id, id);
    this.assertTargetOnly(relation, currentUser.id, 'チェックイン設定');
    this.assertActiveRelation(relation);
    this.assertCheckinConsistency(dto.checkinFrequency, dto.checkinTemplate);

    const settings = await this.prisma.monitoringSettings.upsert({
      where:  { monitoringRelationshipId: id },
      create: {
        monitoringRelationshipId: id,
        checkinFrequency: dto.checkinFrequency,
        checkinTemplate:  dto.checkinTemplate,
      },
      update: {
        checkinFrequency: dto.checkinFrequency,
        checkinTemplate:  dto.checkinTemplate,
      },
      select: { checkinFrequency: true, checkinTemplate: true, updatedAt: true },
    });

    return {
      monitoringRelationshipId: id,
      checkinFrequency: settings.checkinFrequency,
      checkinTemplate:  settings.checkinTemplate,
      updatedAt: settings.updatedAt,
    };
  }

  // ── 設定系共通ヘルパー ────────────────────────────────

  /**
   * currentUserId が関係する monitoring_relationship を取得する。
   * watcher / target どちらでも可。無関係なら 404。
   */
  private async assertParticipant(currentUserId: string, id: string) {
    const relation = await this.prisma.monitoringRelationship.findFirst({
      where: {
        id,
        OR: [
          { watcherUserId: currentUserId },
          { targetUserId:  currentUserId },
        ],
      },
      select: {
        id: true,
        watcherUserId: true,
        targetUserId:  true,
        status: true,
      },
    });
    if (!relation) {
      throw new NotFoundException('Monitoring relationship not found');
    }
    return relation;
  }

  /**
   * currentUserId が target であることを確認する。
   * watcher が更新しようとした場合は 403。
   */
  private assertTargetOnly(
    relation: { watcherUserId: string; targetUserId: string },
    currentUserId: string,
    field: string,
  ): void {
    if (relation.targetUserId !== currentUserId) {
      throw new ForbiddenException(`${field}は見守られる側 (target) のみ更新できます`);
    }
  }

  /**
   * 関係が active であることを確認する。
   * active 以外の場合は 409 (Conflict)。
   */
  private assertActiveRelation(
    relation: { status: MonitoringRelationshipStatus },
  ): void {
    if (relation.status !== MonitoringRelationshipStatus.active) {
      throw new ConflictException(
        'Monitoring relationship is not active. Settings can only be changed on an active relationship.',
      );
    }
  }

  /**
   * checkinFrequency と checkinTemplate の整合性を確認する。
   * 不一致の場合は 400 (BadRequest)。
   */
  private assertCheckinConsistency(
    frequency: number,
    template: CheckinTemplate,
  ): void {
    const expected: Record<number, CheckinTemplate> = {
      1: CheckinTemplate.morning,
      2: CheckinTemplate.morning_evening,
      3: CheckinTemplate.morning_noon_evening,
    };
    if (expected[frequency] !== template) {
      throw new BadRequestException(
        `checkinFrequency=${frequency} には checkinTemplate=${expected[frequency]} が必要です。`,
      );
    }
  }

  // ── Private helpers ───────────────────────────────────

  private async getRelationForTarget(
    tx: PrismaTx,
    targetUserId: string,
    id: string,
  ) {
    const relation = await tx.monitoringRelationship.findFirst({
      where: { id, targetUserId },
      select: { id: true, watcherUserId: true, targetUserId: true, status: true },
    });
    if (!relation) {
      throw new NotFoundException('Monitoring relationship not found');
    }
    return relation;
  }

  private async getRelationForWatcher(
    tx: PrismaTx,
    watcherUserId: string,
    id: string,
  ) {
    const relation = await tx.monitoringRelationship.findFirst({
      where: { id, watcherUserId },
      select: { id: true, watcherUserId: true, targetUserId: true, status: true },
    });
    if (!relation) {
      throw new NotFoundException('Monitoring relationship not found');
    }
    return relation;
  }

  private toSummary(
    r: {
      id: string;
      watcherUserId: string;
      targetUserId: string;
      status: MonitoringRelationshipStatus;
      requestedAt: Date;
      activatedAt: Date | null;
      watcher: MonitoringUserSummary;
      target: MonitoringUserSummary;
    },
    currentUserId: string,
    watcherGateMap?: Map<string, boolean>,
  ): MonitoringRelationshipSummary {
    const isWatcher = r.watcherUserId === currentUserId;
    const counterpart = isWatcher ? r.target : r.watcher;

    let isEffectivelyActive = false;
    if (r.status === MonitoringRelationshipStatus.active) {
      if (watcherGateMap) {
        isEffectivelyActive = watcherGateMap.get(r.watcherUserId) ?? false;
      }
      // watcherGateMap が渡されない場合 (単体取得) は false のまま。
      // getRelationship の呼び出し元が必要なら gate を別途確認する。
    }

    return {
      id: r.id,
      counterpart,
      role: isWatcher ? 'watcher' : 'target',
      status: r.status,
      requestedAt: r.requestedAt,
      activatedAt: r.activatedAt,
      isEffectivelyActive,
    };
  }
}
