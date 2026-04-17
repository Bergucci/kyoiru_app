import type {
  CheckinTemplate,
  MonitoringAlertDeliveryPhase,
  MonitoringRelationshipStatus,
} from '@prisma/client';

export type MonitoringCurrentStage = 'none' | MonitoringAlertDeliveryPhase;

export interface MonitoringAlertCandidate {
  relationshipId: string;
  watcherUserId: string;
  targetUserId: string;
  targetDisplayName: string;
  businessDateJst: string;
  phase: MonitoringAlertDeliveryPhase;
  sentAt: Date;
  canOpenLocationCheck: boolean;
}

export interface MonitoringAlertJobResult {
  attempted: number;
  dispatched: number;
  deliveries: MonitoringAlertCandidate[];
}

export interface MonitoringDashboardItem {
  relationshipId: string;
  target: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  status: MonitoringRelationshipStatus;
  isEffectivelyActive: boolean;
  lastCheckedInAt: Date | null;
  currentStage: MonitoringCurrentStage;
  hasEmergencyContact: boolean;
  checkinFrequency: number;
  checkinTemplate: CheckinTemplate;
  canOpenLocationCheck: boolean;
}
