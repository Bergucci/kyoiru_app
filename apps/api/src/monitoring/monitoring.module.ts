import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { MonitoringController } from './monitoring.controller.js';
import { MonitoringService } from './monitoring.service.js';
import { MonitoringAlertService } from './monitoring-alert.service.js';
import { MonitoringAlertJob } from './monitoring-alert.job.js';
import { MonitoringAlertScheduler } from './monitoring-alert.scheduler.js';
import { MONITORING_ALERT_NOTIFIER } from './monitoring-alert.notifier.js';
import { LoggingMonitoringAlertNotifier } from './logging-monitoring-alert.notifier.js';

@Module({
  imports: [BillingModule],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    MonitoringAlertService,
    MonitoringAlertJob,
    MonitoringAlertScheduler,
    LoggingMonitoringAlertNotifier,
    {
      provide: MONITORING_ALERT_NOTIFIER,
      useExisting: LoggingMonitoringAlertNotifier,
    },
  ],
  exports: [
    MonitoringService,
    MonitoringAlertService,
    MonitoringAlertJob,
    MonitoringAlertScheduler,
  ],
})
export class MonitoringModule {}
