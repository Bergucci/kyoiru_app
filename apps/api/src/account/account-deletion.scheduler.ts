import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AccountDeletionJob } from './account-deletion.job.js';

const JST_TIME_ZONE = 'Asia/Tokyo';

@Injectable()
export class AccountDeletionScheduler {
  private readonly logger = new Logger(AccountDeletionScheduler.name);
  private isRunning = false;

  constructor(private readonly accountDeletionJob: AccountDeletionJob) {}

  @Cron('0 15 * * * *', { timeZone: JST_TIME_ZONE })
  async handleScheduledRun(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Skip account deletion purge schedule because a previous run is still active',
      );
      return;
    }

    this.isRunning = true;

    try {
      const result = await this.accountDeletionJob.run();
      this.logger.log(
        `Account deletion purge completed purge24h=${result.purge24hUsers.length} purge30d=${result.purge30dUsers.length} purge180d=${result.purge180dUsers.length} purge7y=${result.purge7yUsers.length}`,
      );
    } catch (error) {
      this.logger.error(
        'Account deletion purge job failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
