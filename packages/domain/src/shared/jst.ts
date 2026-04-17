// ─────────────────────────────────────────────
// JST (UTC+9) 日付ユーティリティ
//
// 「朝 6:00 を business day の起点とする」ルールを一元管理する。
// Date オブジェクトや外部ライブラリへの依存を最小に保つため、
// Intl.DateTimeFormat (標準 API) のみを使用する。
// ─────────────────────────────────────────────

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const BUSINESS_DAY_START_HOUR = 6; // 朝 6:00

/**
 * UTC の Date を JST の { year, month (1-12), day, hour, minute } に変換する。
 */
export function toJstParts(utc: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const jstMs = utc.getTime() + JST_OFFSET_MS;
  const jst = new Date(jstMs);
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
    hour: jst.getUTCHours(),
    minute: jst.getUTCMinutes(),
  };
}

/**
 * JST の parts から UTC の Date を返す。
 */
export function fromJstParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const jstMs =
    Date.UTC(year, month - 1, day, hour, minute) - JST_OFFSET_MS;
  return new Date(jstMs);
}

/**
 * 指定 UTC 時刻を含む「業務日」の報告期限 (JST 朝 6:00) を UTC で返す。
 *
 * - JST 朝 6:00 以降 → 当日の 翌朝 6:00 が期限
 * - JST 朝 6:00 未満 → 当日の 朝 6:00 が期限
 */
export function getDeadlineUtc(now: Date): Date {
  const { year, month, day, hour } = toJstParts(now);
  if (hour >= BUSINESS_DAY_START_HOUR) {
    // 翌日 JST 朝 6:00
    const next = fromJstParts(year, month, day + 1, BUSINESS_DAY_START_HOUR, 0);
    return next;
  }
  // 当日 JST 朝 6:00
  return fromJstParts(year, month, day, BUSINESS_DAY_START_HOUR, 0);
}

/**
 * 指定 UTC 時刻を含む「業務日」の開始時刻 (JST 朝 6:00) を UTC で返す。
 *
 * - JST 朝 6:00 以降 → 当日 JST 朝 6:00
 * - JST 朝 6:00 未満 → 前日 JST 朝 6:00
 */
export function getBusinessDayStartUtc(now: Date): Date {
  const { year, month, day, hour } = toJstParts(now);
  if (hour >= BUSINESS_DAY_START_HOUR) {
    return fromJstParts(year, month, day, BUSINESS_DAY_START_HOUR, 0);
  }
  // JST 朝 6:00 より前: 業務日は前日の朝 6:00 から
  return fromJstParts(year, month, day - 1, BUSINESS_DAY_START_HOUR, 0);
}

/**
 * now が deadline を超過しているかを返す。
 */
export function isOverDeadline(now: Date, deadline: Date): boolean {
  return now.getTime() > deadline.getTime();
}
