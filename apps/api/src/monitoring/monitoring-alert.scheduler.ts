import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MonitoringAlertJob } from './monitoring-alert.job.js';

const JST_TIME_ZONE = 'Asia/Tokyo';

@Injectable()
export class MonitoringAlertScheduler {
  private readonly logger = new Logger(MonitoringAlertScheduler.name);
  private isRunning = false;

  constructor(private readonly monitoringAlertJob: MonitoringAlertJob) {}

  @Cron('0 0 6,12,21 * * *', { timeZone: JST_TIME_ZONE })
  async handleScheduledRun(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Skip monitoring alert schedule because a previous run is still active',
      );
      return;
    }

    this.isRunning = true;

    try {
      const result = await this.monitoringAlertJob.run();
      this.logger.log(
        `Monitoring alert job completed attempted=${result.attempted} dispatched=${result.dispatched}`,
      );
    } catch (error) {
      this.logger.error(
        'Monitoring alert job failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
