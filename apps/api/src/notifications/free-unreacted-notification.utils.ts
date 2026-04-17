import {
  FreeCheckinReminderPhase,
  GroupNotificationLevel,
} from '@prisma/client';
import { getBusinessDayStartUtc, toJstParts } from '@kyoiru/domain';
import { getCurrentBusinessDateJst } from '../me/me.utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface FreeUnreactedNotificationRun {
  phase: FreeCheckinReminderPhase;
  businessDateJst: string;
  notificationLevels: GroupNotificationLevel[];
}

export function resolveFreeUnreactedNotificationRuns(
  now: Date,
): FreeUnreactedNotificationRun[] {
  const { hour } = toJstParts(now);

  if (hour === 21) {
    return [
      {
        phase: FreeCheckinReminderPhase.caring_21,
        businessDateJst: getCurrentBusinessDateJst(now),
        notificationLevels: [GroupNotificationLevel.caring],
      },
    ];
  }

  if (hour === 6) {
    const previousBusinessDateJst = formatBusinessDateJst(
      new Date(getBusinessDayStartUtc(now).getTime() - DAY_MS),
    );
    return [
      {
        phase: FreeCheckinReminderPhase.normal_next_morning,
        businessDateJst: previousBusinessDateJst,
        notificationLevels: [GroupNotificationLevel.normal],
      },
      {
        phase: FreeCheckinReminderPhase.caring_next_morning,
        businessDateJst: previousBusinessDateJst,
        notificationLevels: [GroupNotificationLevel.caring],
      },
    ];
  }

  return [];
}

export function isFreeNotificationQuietHours(now: Date): boolean {
  const { hour } = toJstParts(now);
  return hour >= 22 || hour < 7;
}

function formatBusinessDateJst(utc: Date): string {
  const { year, month, day } = toJstParts(utc);
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}
