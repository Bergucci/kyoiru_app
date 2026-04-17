import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FreeUnreactedNotificationJob } from './free-unreacted-notification.job.js';

const JST_TIME_ZONE = 'Asia/Tokyo';

@Injectable()
export class FreeUnreactedNotificationScheduler {
  private readonly logger = new Logger(
    FreeUnreactedNotificationScheduler.name,
  );
  private isRunning = false;

  constructor(
    private readonly freeUnreactedNotificationJob: FreeUnreactedNotificationJob,
  ) {}

  @Cron('0 0 6,21 * * *', { timeZone: JST_TIME_ZONE })
  async handleScheduledRun(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Skip free unreacted notification schedule because a previous run is still active',
      );
      return;
    }

    this.isRunning = true;

    try {
      const result = await this.freeUnreactedNotificationJob.run();
      this.logger.log(
        `Free unreacted notification job completed attempted=${result.attempted} dispatched=${result.dispatched}`,
      );
    } catch (error) {
      this.logger.error(
        'Free unreacted notification job failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
