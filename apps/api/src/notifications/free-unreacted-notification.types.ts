import type {
  FreeCheckinReminderPhase,
  GroupNotificationLevel,
} from '@prisma/client';

export interface FreeUnreactedNotificationCandidate {
  groupId: string;
  groupName: string;
  userId: string;
  userDisplayName: string;
  businessDateJst: string;
  phase: FreeCheckinReminderPhase;
  notificationLevel: GroupNotificationLevel;
  sentAt: Date;
}

export interface FreeUnreactedNotificationJobResult {
  attempted: number;
  dispatched: number;
  deliveries: FreeUnreactedNotificationCandidate[];
}
