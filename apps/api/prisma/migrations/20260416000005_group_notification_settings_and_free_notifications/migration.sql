CREATE TYPE "GroupNotificationLevel" AS ENUM ('loose', 'normal', 'caring');

CREATE TYPE "FreeCheckinReminderPhase" AS ENUM (
  'caring_21',
  'normal_next_morning',
  'caring_next_morning'
);

ALTER TABLE "groups"
ADD COLUMN "notification_level" "GroupNotificationLevel" NOT NULL DEFAULT 'normal';

CREATE TABLE "free_checkin_reminder_deliveries" (
  "id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "business_date_jst" TEXT NOT NULL,
  "phase" "FreeCheckinReminderPhase" NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "free_checkin_reminder_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_free_checkin_reminder_deliveries_scope"
ON "free_checkin_reminder_deliveries"(
  "group_id",
  "user_id",
  "business_date_jst",
  "phase"
);

CREATE INDEX "idx_free_checkin_reminder_deliveries_business_date_phase"
ON "free_checkin_reminder_deliveries"("business_date_jst", "phase");

CREATE INDEX "idx_free_checkin_reminder_deliveries_user_created_at"
ON "free_checkin_reminder_deliveries"("user_id", "created_at");

ALTER TABLE "free_checkin_reminder_deliveries"
ADD CONSTRAINT "free_checkin_reminder_deliveries_group_id_fkey"
FOREIGN KEY ("group_id") REFERENCES "groups"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "free_checkin_reminder_deliveries"
ADD CONSTRAINT "free_checkin_reminder_deliveries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
