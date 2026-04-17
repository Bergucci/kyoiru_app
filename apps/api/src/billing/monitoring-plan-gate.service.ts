import { ForbiddenException, Injectable } from '@nestjs/common';
import { BillingService } from './billing.service.js';

@Injectable()
export class MonitoringPlanGateService {
  constructor(private readonly billingService: BillingService) {}

  async canUseMonitoringFeatures(userId: string): Promise<boolean> {
    const entitlement = await this.billingService.getMonitoringEntitlementByUserId(
      userId,
    );
    return entitlement.isActiveForFeatures;
  }

  async assertMonitoringFeaturesAvailable(userId: string): Promise<void> {
    const entitlement = await this.billingService.getMonitoringEntitlementByUserId(
      userId,
    );

    if (!entitlement.isActiveForFeatures) {
      throw new ForbiddenException('Monitoring plan required');
    }
  }
}
