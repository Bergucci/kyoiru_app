import { MonitoringAlertDeliveryPhase } from '@prisma/client';
import { getBusinessDayStartUtc, toJstParts } from '@kyoiru/domain';
import { getCurrentBusinessDateJst } from '../me/me.utils.js';
import type { MonitoringCurrentStage } from './monitoring-alert.types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MonitoringAlertRun {
  phase: MonitoringAlertDeliveryPhase;
  businessDateJst: string;
}

export interface MonitoringStageState {
  currentStage: MonitoringCurrentStage;
  stageBusinessDateJst: string | null;
  canOpenLocationCheck: boolean;
}

export function resolveMonitoringAlertRuns(now: Date): MonitoringAlertRun[] {
  const { hour } = toJstParts(now);

  if (hour === 21) {
    return [
      {
        phase: MonitoringAlertDeliveryPhase.monitor_stage_1,
        businessDateJst: getCurrentBusinessDateJst(now),
      },
    ];
  }

  if (hour === 6) {
    return [
      {
        phase: MonitoringAlertDeliveryPhase.monitor_stage_2,
        businessDateJst: getPreviousBusinessDateJst(now),
      },
    ];
  }

  if (hour === 12) {
    return [
      {
        phase: MonitoringAlertDeliveryPhase.monitor_stage_3,
        businessDateJst: getPreviousBusinessDateJst(now),
      },
    ];
  }

  return [];
}

export function resolveMonitoringCurrentStage(input: {
  now: Date;
  hasCurrentBusinessDayCheckin: boolean;
  hasPreviousBusinessDayCheckin: boolean;
}): MonitoringStageState {
  const { now, hasCurrentBusinessDayCheckin, hasPreviousBusinessDayCheckin } =
    input;
  const { hour } = toJstParts(now);
  const currentBusinessDateJst = getCurrentBusinessDateJst(now);
  const previousBusinessDateJst = getPreviousBusinessDateJst(now);

  if (hour < 6) {
    return {
      currentStage: 'none',
      stageBusinessDateJst: null,
      canOpenLocationCheck: false,
    };
  }

  if (hour < 12) {
    if (!hasPreviousBusinessDayCheckin) {
      return {
        currentStage: MonitoringAlertDeliveryPhase.monitor_stage_2,
        stageBusinessDateJst: previousBusinessDateJst,
        canOpenLocationCheck: true,
      };
    }

    return {
      currentStage: 'none',
      stageBusinessDateJst: null,
      canOpenLocationCheck: false,
    };
  }

  if (!hasPreviousBusinessDayCheckin) {
    return {
      currentStage: MonitoringAlertDeliveryPhase.monitor_stage_3,
      stageBusinessDateJst: previousBusinessDateJst,
      canOpenLocationCheck: true,
    };
  }

  if (hour < 21) {
    return {
      currentStage: 'none',
      stageBusinessDateJst: null,
      canOpenLocationCheck: false,
    };
  }

  if (!hasCurrentBusinessDayCheckin) {
    return {
      currentStage: MonitoringAlertDeliveryPhase.monitor_stage_1,
      stageBusinessDateJst: currentBusinessDateJst,
      canOpenLocationCheck: false,
    };
  }

  return {
    currentStage: 'none',
    stageBusinessDateJst: null,
    canOpenLocationCheck: false,
  };
}

export function getPreviousBusinessDateJst(now: Date): string {
  return formatBusinessDateJst(
    new Date(getBusinessDayStartUtc(now).getTime() - DAY_MS),
  );
}

function formatBusinessDateJst(utc: Date): string {
  const { year, month, day } = toJstParts(utc);
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}
