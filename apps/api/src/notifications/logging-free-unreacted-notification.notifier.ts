import { Injectable, Logger } from '@nestjs/common';
import type { FreeUnreactedNotificationNotifier } from './free-unreacted-notification.notifier.js';
import type { FreeUnreactedNotificationCandidate } from './free-unreacted-notification.types.js';

@Injectable()
export class LoggingFreeUnreactedNotificationNotifier
  implements FreeUnreactedNotificationNotifier
{
  private readonly logger = new Logger(
    LoggingFreeUnreactedNotificationNotifier.name,
  );

  async send(candidate: FreeUnreactedNotificationCandidate): Promise<void> {
    this.logger.log(
      `free-unreacted-notification phase=${candidate.phase} groupId=${candidate.groupId} userId=${candidate.userId} businessDateJst=${candidate.businessDateJst}`,
    );
  }
}
