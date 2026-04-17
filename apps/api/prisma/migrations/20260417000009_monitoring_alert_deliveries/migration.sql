-- ─────────────────────────────────────────────────────────────────────────────
-- Step 7-3: monitoring_alert_deliveries
-- 見守り段階通知の送信正本
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
-- monitor_stage_1 = 当日 21:00 時点で未反応
-- monitor_stage_2 = 翌日 6:00 時点でも未反応
-- monitor_stage_3 = 翌日 12:00 時点でも未反応
CREATE TYPE "MonitoringAlertDeliveryPhase" AS ENUM (
  'monitor_stage_1',
  'monitor_stage_2',
  'monitor_stage_3'
);

-- CreateTable
CREATE TABLE "monitoring_alert_deliveries" (
    "id"                         UUID NOT NULL,
    "monitoring_relationship_id" UUID NOT NULL,
    "business_date_jst"          TEXT NOT NULL,
    "phase"                      "MonitoringAlertDeliveryPhase" NOT NULL,
    "sent_at"                    TIMESTAMP(3) NOT NULL,
    "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_alert_deliveries_pkey" PRIMARY KEY ("id")
);

-- 重複送信防止
CREATE UNIQUE INDEX "uq_monitoring_alert_deliveries_scope"
    ON "monitoring_alert_deliveries"(
      "monitoring_relationship_id",
      "business_date_jst",
      "phase"
    );

-- 検索用インデックス
CREATE INDEX "monitoring_alert_deliveries_business_date_jst_phase_idx"
    ON "monitoring_alert_deliveries"("business_date_jst", "phase");

CREATE INDEX "monitoring_alert_deliveries_rel_created_at_idx"
    ON "monitoring_alert_deliveries"("monitoring_relationship_id", "created_at");

-- FK
ALTER TABLE "monitoring_alert_deliveries"
    ADD CONSTRAINT "monitoring_alert_deliveries_monitoring_relationship_id_fkey"
    FOREIGN KEY ("monitoring_relationship_id")
    REFERENCES "monitoring_relationships"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
