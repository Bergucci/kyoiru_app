import { Inject, Injectable } from '@nestjs/common';
import {
  MONITORING_ALERT_NOTIFIER,
  type MonitoringAlertNotifier,
} from './monitoring-alert.notifier.js';
import type { MonitoringAlertJobResult } from './monitoring-alert.types.js';
import { MonitoringAlertService } from './monitoring-alert.service.js';

@Injectable()
export class MonitoringAlertJob {
  constructor(
    private readonly monitoringAlertService: MonitoringAlertService,
    @Inject(MONITORING_ALERT_NOTIFIER)
    private readonly notifier: MonitoringAlertNotifier,
  ) {}

  async run(now: Date = new Date()): Promise<MonitoringAlertJobResult> {
    const deliveries = await this.monitoringAlertService.reserveDueNotifications(
      now,
    );

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
