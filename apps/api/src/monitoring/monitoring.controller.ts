import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ActiveProfileGuard } from '../auth/guards/active-profile.guard.js';
import { MonitoringService } from './monitoring.service.js';
import { MonitoringAlertService } from './monitoring-alert.service.js';
import { StartMonitoringRequestDto } from './dto/start-monitoring-request.dto.js';
import { MonitoringIdParamDto } from './dto/monitoring-id-param.dto.js';
import { UpdateMonitoringSettingsDto } from './dto/update-monitoring-settings.dto.js';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto.js';
import { UpdateCheckinSettingsDto } from './dto/update-checkin-settings.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

/**
 * 見守り同意フロー API
 *
 * 全エンドポイントに JwtAuthGuard + ActiveProfileGuard を適用する。
 *
 * ルート設計:
 *   POST   /monitoring/requests                  — 見守り開始リクエスト送信 (watcher)
 *   GET    /monitoring/requests/incoming         — 自分宛て pending 一覧 (target)
 *   GET    /monitoring/requests/outgoing         — 自分が送った pending 一覧 (watcher)
 *   POST   /monitoring/requests/:id/approve      — 同意 (target)
 *   POST   /monitoring/requests/:id/reject       — 拒否 (target)
 *   POST   /monitoring/requests/:id/cancel       — 取消 (watcher)
 *   GET    /monitoring/dashboard                 — watcher 向け見守りダッシュボード最小版
 *   POST   /monitoring/:id/revoke                — 同意撤回 (target)
 *   GET    /monitoring/:id/settings              — GPS 共有設定取得 (watcher / target)
 *   PATCH  /monitoring/:id/settings              — GPS 共有設定更新 (target only / active のみ)
 *   GET    /monitoring/:id/emergency-contact/final-stage
 *                                               — watcher 向け最終段階専用 緊急連絡先取得
 *   GET    /monitoring/:id/emergency-contact     — 緊急連絡先取得 (target only / stopped 後も可)
 *   PUT    /monitoring/:id/emergency-contact     — 緊急連絡先設定 (target only / active のみ)
 *   GET    /monitoring/:id/checkin-settings      — チェックイン設定取得 (watcher / target)
 *   PATCH  /monitoring/:id/checkin-settings      — チェックイン設定更新 (target only / active のみ)
 *   GET    /monitoring/:id                       — 状態取得 (watcher / target)
 *   GET    /monitoring                           — 一覧取得 (watcher / target)
 *
 * 注意: NestJS はコントローラー内でルートを登録順に評価するため、
 * リテラルセグメント (/requests/incoming, :id/settings など) を :id より前に配置する。
 */
@Controller('monitoring')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly monitoringAlertService: MonitoringAlertService,
  ) {}

  // ── /monitoring/requests/* (リテラル先行) ──────────────

  /**
   * POST /monitoring/requests
   * watcher が target への見守りリクエストを送る。
   * 課金 gate・block 確認後、status = pending で作成する。
   * この時点では active にならない。
   */
  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  startRequest(
    @Request() req: ActiveUserRequest,
    @Body() dto: StartMonitoringRequestDto,
  ) {
    return this.monitoringService.startRequest(req.user, dto);
  }

  /**
   * GET /monitoring/requests/incoming
   * target 本人宛ての pending リクエスト一覧。
   */
  @Get('requests/incoming')
  getIncomingRequests(@Request() req: ActiveUserRequest) {
    return this.monitoringService.getIncomingRequests(req.user);
  }

  /**
   * GET /monitoring/requests/outgoing
   * watcher 本人が送った pending リクエスト一覧。
   */
  @Get('requests/outgoing')
  getOutgoingRequests(@Request() req: ActiveUserRequest) {
    return this.monitoringService.getOutgoingRequests(req.user);
  }

  /**
   * POST /monitoring/requests/:id/approve
   * target が pending リクエストに同意する。
   * この時点でのみ status = active になる。
   */
  @Post('requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveRequest(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringService.approveRequest(req.user, params.id);
  }

  /**
   * POST /monitoring/requests/:id/reject
   * target が pending リクエストを拒否する。
   */
  @Post('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectRequest(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringService.rejectRequest(req.user, params.id);
  }

  /**
   * POST /monitoring/requests/:id/cancel
   * watcher が自分の pending リクエストを取消する。
   */
  @Post('requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelRequest(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringService.cancelRequest(req.user, params.id);
  }

  /**
   * GET /monitoring/dashboard
   * watcher 自身が見守っている関係の最小ダッシュボードを返す。
   * 緊急連絡先本体は返さず、currentStage / canOpenLocationCheck を含める。
   */
  @Get('dashboard')
  getDashboard(@Request() req: ActiveUserRequest) {
    return this.monitoringAlertService.getDashboard(req.user);
  }

  // ── /monitoring/:id / /monitoring ─────────────────────

  /**
   * POST /monitoring/:id/revoke
   * target が active な見守りを撤回する。撤回後は即停止。
   * watcher の課金が有効でも自動再開しない。
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  revokeConsent(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringService.revokeConsent(req.user, params.id);
  }

  // ── GPS 共有設定 (:id/settings) ────────────────────────

  /**
   * GET /monitoring/:id/settings
   * GPS 共有設定を取得する。watcher / target どちらでも可。stopped 後も取得可。
   */
  @Get(':id/settings')
  getMonitoringSettings(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringService.getMonitoringSettings(req.user, params.id);
  }

  /**
   * PATCH /monitoring/:id/settings
   * GPS 共有設定を更新する。target のみ・active 状態のみ許可。
   */
  @Patch(':id/settings')
  @HttpCode(HttpStatus.OK)
  updateMonitoringSettings(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
    @Body() dto: UpdateMonitoringSettingsDto,
  ) {
    return this.monitoringService.updateMonitoringSettings(req.user, params.id, dto);
  }

  // ── 緊急連絡先 (:id/emergency-contact) ────────────────

  /**
   * GET /monitoring/:id/emergency-contact/final-stage
   * watcher が最終段階のときのみ緊急連絡先本体を取得できる。
   * 平常時や第1/第2段階では閉じる。
   */
  @Get(':id/emergency-contact/final-stage')
  getFinalStageEmergencyContact(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringAlertService.getFinalStageEmergencyContact(
      req.user,
      params.id,
    );
  }

  /**
   * GET /monitoring/:id/emergency-contact
   * 緊急連絡先を取得する。target 本人のみ可。watcher は 403。stopped 後も target は取得可。
   * 未設定の場合は emergencyContact: null を返す。
   * watcher への表示は将来の段階通知 Step (最終段階のみ) で実装する。
   */
  @Get(':id/emergency-contact')
  getEmergencyContact(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringService.getEmergencyContact(req.user, params.id);
  }

  /**
   * PUT /monitoring/:id/emergency-contact
   * 緊急連絡先を作成または更新する (upsert)。
   * target のみ・active 状態のみ許可。1 件のみ保持。
   */
  @Put(':id/emergency-contact')
  @HttpCode(HttpStatus.OK)
  upsertEmergencyContact(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
    @Body() dto: UpdateEmergencyContactDto,
  ) {
    return this.monitoringService.upsertEmergencyContact(req.user, params.id, dto);
  }

  // ── チェックイン設定 (:id/checkin-settings) ───────────

  /**
   * GET /monitoring/:id/checkin-settings
   * チェックイン設定を取得する。watcher / target どちらでも可。stopped 後も取得可。
   */
  @Get(':id/checkin-settings')
  getCheckinSettings(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringService.getCheckinSettings(req.user, params.id);
  }

  /**
   * PATCH /monitoring/:id/checkin-settings
   * チェックイン設定を更新する。target のみ・active 状態のみ許可。
   * checkinFrequency と checkinTemplate の整合性を service 層でチェックする。
   */
  @Patch(':id/checkin-settings')
  @HttpCode(HttpStatus.OK)
  updateCheckinSettings(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
    @Body() dto: UpdateCheckinSettingsDto,
  ) {
    return this.monitoringService.updateCheckinSettings(req.user, params.id, dto);
  }

  /**
   * GET /monitoring/:id
   * watcher / target どちらでも自分に関係する 1 件を取得できる。
   * isEffectivelyActive は status = active かつ gate 有効のとき true。
   */
  @Get(':id')
  getRelationship(
    @Request() req: ActiveUserRequest,
    @Param() params: MonitoringIdParamDto,
  ) {
    return this.monitoringService.getRelationship(req.user, params.id);
  }

  /**
   * GET /monitoring
   * 自分に関係する全見守り関係 (watcher / target 双方) を返す。
   */
  @Get()
  listRelationships(@Request() req: ActiveUserRequest) {
    return this.monitoringService.listRelationships(req.user);
  }
}
