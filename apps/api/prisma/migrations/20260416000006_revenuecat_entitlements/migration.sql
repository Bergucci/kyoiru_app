CREATE TYPE "SubscriptionEntitlementStatus" AS ENUM (
  'active',
  'grace',
  'expired'
);

CREATE TABLE "user_subscription_entitlements" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "entitlement_key" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" "SubscriptionEntitlementStatus" NOT NULL,
  "current_period_expires_at" TIMESTAMP(3),
  "grace_period_expires_at" TIMESTAMP(3),
  "trial_ends_at" TIMESTAMP(3),
  "has_used_trial" BOOLEAN NOT NULL DEFAULT false,
  "source_app_user_id" TEXT,
  "last_event_id" TEXT NOT NULL,
  "last_event_type" TEXT NOT NULL,
  "last_event_timestamp_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_subscription_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_user_subscription_entitlements_user_key"
ON "user_subscription_entitlements"("user_id", "entitlement_key");

CREATE INDEX "idx_user_subscription_entitlements_status_updated_at"
ON "user_subscription_entitlements"("status", "updated_at");

ALTER TABLE "user_subscription_entitlements"
ADD CONSTRAINT "user_subscription_entitlements_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "revenuecat_webhook_events" (
  "id" TEXT NOT NULL,
  "user_id" UUID,
  "app_user_id" TEXT,
  "event_type" TEXT NOT NULL,
  "entitlement_key" TEXT,
  "event_timestamp_at" TIMESTAMP(3),
  "environment" TEXT,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3),
  "ignored_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "revenuecat_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_revenuecat_webhook_events_app_user_id_created_at"
ON "revenuecat_webhook_events"("app_user_id", "created_at");

CREATE INDEX "idx_revenuecat_webhook_events_user_id_created_at"
ON "revenuecat_webhook_events"("user_id", "created_at");

CREATE INDEX "idx_revenuecat_webhook_events_event_type_created_at"
ON "revenuecat_webhook_events"("event_type", "created_at");

ALTER TABLE "revenuecat_webhook_events"
ADD CONSTRAINT "revenuecat_webhook_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
