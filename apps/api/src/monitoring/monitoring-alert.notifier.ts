import type { MonitoringAlertCandidate } from './monitoring-alert.types.js';

export const MONITORING_ALERT_NOTIFIER = Symbol('MONITORING_ALERT_NOTIFIER');

export interface MonitoringAlertNotifier {
  send(candidate: MonitoringAlertCandidate): Promise<void>;
}
