import { computeAlivePhase, getBusinessDayStartUtc, toJstParts } from '@kyoiru/domain';

const DAY_MS = 24 * 60 * 60 * 1000;

export const MOOD_STAMP_VALUES = [
  '元気',
  '眠い',
  '忙しい',
  'しんどい',
  'ふつう',
] as const;

export type MoodStampValue = (typeof MOOD_STAMP_VALUES)[number];
export type DailyAliveState = 'checked_in' | 'pending' | 'overdue' | 'monitor_alert';

export function getCurrentBusinessDateJst(now: Date): string {
  return formatBusinessDateJst(getBusinessDayStartUtc(now));
}

export function listRecentBusinessDatesJst(now: Date, days: number): string[] {
  const businessDayStart = getBusinessDayStartUtc(now);
  return Array.from({ length: days }, (_, index) =>
    formatBusinessDateJst(new Date(businessDayStart.getTime() - index * DAY_MS)),
  );
}

export function getCurrentAliveState(
  now: Date,
  lastCheckedInAt: Date | null,
): DailyAliveState {
  return computeAlivePhase({
    now,
    lastReportedAt: lastCheckedInAt,
    monitorAlertSent: false,
  });
}

function formatBusinessDateJst(utc: Date): string {
  const { year, month, day } = toJstParts(utc);
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}
