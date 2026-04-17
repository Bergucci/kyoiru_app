import { Inject, Injectable } from '@nestjs/common';
import type { FreeUnreactedNotificationNotifier } from './free-unreacted-notification.notifier.js';
import { FREE_UNREACTED_NOTIFICATION_NOTIFIER } from './free-unreacted-notification.notifier.js';
import type { FreeUnreactedNotificationJobResult } from './free-unreacted-notification.types.js';
import { FreeUnreactedNotificationService } from './free-unreacted-notification.service.js';

@Injectable()
export class FreeUnreactedNotificationJob {
  constructor(
    private readonly freeUnreactedNotificationService: FreeUnreactedNotificationService,
    @Inject(FREE_UNREACTED_NOTIFICATION_NOTIFIER)
    private readonly notifier: FreeUnreactedNotificationNotifier,
  ) {}

  async run(now: Date = new Date()): Promise<FreeUnreactedNotificationJobResult> {
    const deliveries =
      await this.freeUnreactedNotificationService.reserveDueNotifications(now);

    for (const delivery of deliveries) {
      await this.notifier.send(delivery);
    }

    return {
      attempted: deliveries.length,
      dispatched: deliveries.length,
      deliveries,
    };
  }
}
