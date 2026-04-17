export type BillingEntitlementResponseStatus =
  | 'inactive'
  | 'active'
  | 'grace'
  | 'expired';

export interface BillingEntitlementSummary {
  planName: string;
  status: BillingEntitlementResponseStatus;
  currentPeriodExpiresAt: Date | null;
  gracePeriodExpiresAt: Date | null;
  isActiveForFeatures: boolean;
}

export interface RevenueCatWebhookResult {
  eventId: string;
  status: 'processed' | 'duplicate' | 'ignored';
  reason?: string;
}
