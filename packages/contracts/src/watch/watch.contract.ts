// ─────────────────────────────────────────────
// 見守り API 契約 (Step 5 以降で実装)
// ─────────────────────────────────────────────

// --- enums ---

/** 生存報告フェーズ (source-spec 語彙準拠) */
export const AlivePhase = {
  /** 当日分の報告済み */
  CheckedIn: 'checked_in',
  /** 当日の報告期限前・未報告 */
  Pending: 'pending',
  /** 期限超過・見守り通知前 */
  Overdue: 'overdue',
  /** 見守り側への通知送信済み */
  MonitorAlert: 'monitor_alert',
} as const;
export type AlivePhase = (typeof AlivePhase)[keyof typeof AlivePhase];

// --- request ---

export interface ReportAliveRequest {
  /** クライアント側の報告日時 (ISO 8601) */
  reportedAt: string;
}

// --- response ---

export interface AliveStatusResponse {
  userId: string;
  phase: AlivePhase;
  /** 直近の報告日時 (ISO 8601 / null = 未報告) */
  lastReportedAt: string | null;
  /** 当日の報告期限 (ISO 8601 / JST 朝 6:00 基準) */
  deadlineAt: string;
}

export interface WatchTargetSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  aliveStatus: AliveStatusResponse;
}
