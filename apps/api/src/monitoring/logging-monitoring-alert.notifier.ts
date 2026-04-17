import { Injectable, Logger } from '@nestjs/common';
import type { MonitoringAlertNotifier } from './monitoring-alert.notifier.js';
import type { MonitoringAlertCandidate } from './monitoring-alert.types.js';

@Injectable()
export class LoggingMonitoringAlertNotifier implements MonitoringAlertNotifier {
  private readonly logger = new Logger(LoggingMonitoringAlertNotifier.name);

  async send(candidate: MonitoringAlertCandidate): Promise<void> {
    this.logger.log(
      `monitoring-alert phase=${candidate.phase} relationshipId=${candidate.relationshipId} watcherUserId=${candidate.watcherUserId} targetUserId=${candidate.targetUserId} businessDateJst=${candidate.businessDateJst} canOpenLocationCheck=${candidate.canOpenLocationCheck}`,
    );
  }
}
