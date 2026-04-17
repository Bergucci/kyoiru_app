import { Module } from '@nestjs/common';
import { FreeUnreactedNotificationJob } from './free-unreacted-notification.job.js';
import { FreeUnreactedNotificationScheduler } from './free-unreacted-notification.scheduler.js';
import { FreeUnreactedNotificationService } from './free-unreacted-notification.service.js';
import { FREE_UNREACTED_NOTIFICATION_NOTIFIER } from './free-unreacted-notification.notifier.js';
import { LoggingFreeUnreactedNotificationNotifier } from './logging-free-unreacted-notification.notifier.js';

@Module({
  providers: [
    FreeUnreactedNotificationService,
    FreeUnreactedNotificationJob,
    FreeUnreactedNotificationScheduler,
    LoggingFreeUnreactedNotificationNotifier,
    {
      provide: FREE_UNREACTED_NOTIFICATION_NOTIFIER,
      useExisting: LoggingFreeUnreactedNotificationNotifier,
    },
  ],
  exports: [
    FreeUnreactedNotificationService,
    FreeUnreactedNotificationJob,
    FreeUnreactedNotificationScheduler,
  ],
})
export class NotificationsModule {}
