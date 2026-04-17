import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { MonitoringPlanEntitlementLifecycleService } from './monitoring-plan-entitlement-lifecycle.service.js';
import { MonitoringPlanGateService } from './monitoring-plan-gate.service.js';
import { SubscriptionCopyService } from './subscription-copy.service.js';
import { LegalModule } from '../legal/legal.module.js';

@Module({
  imports: [LegalModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    MonitoringPlanEntitlementLifecycleService,
    MonitoringPlanGateService,
    SubscriptionCopyService,
  ],
  exports: [BillingService, MonitoringPlanGateService, SubscriptionCopyService],
})
export class BillingModule {}
