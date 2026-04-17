import type { FreeUnreactedNotificationCandidate } from './free-unreacted-notification.types.js';

export const FREE_UNREACTED_NOTIFICATION_NOTIFIER = Symbol(
  'FREE_UNREACTED_NOTIFICATION_NOTIFIER',
);

export interface FreeUnreactedNotificationNotifier {
  send(candidate: FreeUnreactedNotificationCandidate): Promise<void>;
}
