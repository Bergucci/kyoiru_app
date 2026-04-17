// ─────────────────────────────────────────────
// 生存報告フェーズの内部表現と遷移判定
//
// contracts の AlivePhase (API 境界用文字列) と語彙を揃えた
// UI・DB 非依存の純粋判定関数。
// ─────────────────────────────────────────────
import { getBusinessDayStartUtc, getDeadlineUtc, isOverDeadline } from '../shared/jst';

// ── 内部フェーズ定義 (source-spec 語彙準拠) ──

export type InternalAlivePhase =
  | 'checked_in'    // 当日業務日内に報告済み
  | 'pending'       // 未報告・期限前
  | 'overdue'       // 期限超過・見守り通知前
  | 'monitor_alert' // 見守り側への通知送信済み

// ── フェーズ判定 ──────────────────────────────

export interface AlivePhaseInput {
  now: Date;
  /** 直近の報告日時 (null = 未報告) */
  lastReportedAt: Date | null;
  /** 見守り通知送信済みかどうか */
  monitorAlertSent: boolean;
}

/**
 * 現在フェーズを純粋関数として返す。
 * DB / HTTP / タイマーへの依存なし。
 *
 * 判定基準:
 *   - 業務日開始 = JST 朝 6:00 (getBusinessDayStartUtc)
 *   - 業務日期限 = 翌 JST 朝 6:00 (getDeadlineUtc)
 *   - lastReportedAt >= 業務日開始 → checked_in
 *   - 期限前 (now <= deadline) → pending
 *   - 期限超過 + monitorAlertSent → monitor_alert
 *   - 期限超過 + 未通知 → overdue
 */
export function computeAlivePhase(input: AlivePhaseInput): InternalAlivePhase {
  const { now, lastReportedAt, monitorAlertSent } = input;
  const businessDayStart = getBusinessDayStartUtc(now);
  const deadline = getDeadlineUtc(now);

  if (
    lastReportedAt !== null &&
    lastReportedAt.getTime() >= businessDayStart.getTime()
  ) {
    return 'checked_in';
  }

  if (!isOverDeadline(now, deadline)) {
    return 'pending';
  }

  return monitorAlertSent ? 'monitor_alert' : 'overdue';
}
