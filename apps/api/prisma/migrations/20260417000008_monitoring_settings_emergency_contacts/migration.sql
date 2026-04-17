-- ─────────────────────────────────────────────────────────────────────────────
-- Step 7-2: monitoring_settings / emergency_contacts
-- 見守り設定正本・緊急連絡先正本・課金 lifecycle 停止フックの準備
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Enum: GpsShareMode ──────────────────────────────────────────────────────
-- off        = 共有しない
-- on_overdue = 未反応時のみ参照可能 (初期値)
-- always     = 常時共有
CREATE TYPE "GpsShareMode" AS ENUM (
  'off',
  'on_overdue',
  'always'
);

-- ─── Enum: CheckinTemplate ───────────────────────────────────────────────────
-- morning              = 朝のみ (1回)
-- morning_evening      = 朝・夜 (2回)
-- morning_noon_evening = 朝・昼・夜 (3回)
CREATE TYPE "CheckinTemplate" AS ENUM (
  'morning',
  'morning_evening',
  'morning_noon_evening'
);

-- ─── monitoring_settings ─────────────────────────────────────────────────────
-- 見守り設定の正本。active 時に初期値で生成。stopped 後も保持する。
-- 1:1 (monitoring_relationships)
CREATE TABLE "monitoring_settings" (
    "id"                         UUID         NOT NULL,
    "monitoring_relationship_id" UUID         NOT NULL,
    "gps_share_mode"             "GpsShareMode"   NOT NULL DEFAULT 'on_overdue',
    "checkin_frequency"          INTEGER      NOT NULL DEFAULT 1,
    "checkin_template"           "CheckinTemplate" NOT NULL DEFAULT 'morning',
    "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                 TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_settings_pkey" PRIMARY KEY ("id")
);

-- 1:1 保証
CREATE UNIQUE INDEX "monitoring_settings_monitoring_relationship_id_key"
    ON "monitoring_settings"("monitoring_relationship_id");

-- FK → monitoring_relationships
ALTER TABLE "monitoring_settings"
    ADD CONSTRAINT "monitoring_settings_monitoring_relationship_id_fkey"
    FOREIGN KEY ("monitoring_relationship_id")
    REFERENCES "monitoring_relationships"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── emergency_contacts ──────────────────────────────────────────────────────
-- 緊急連絡先の正本。1:1 (monitoring_relationships)。
-- target 本人が設定。stopped 後も保持する。
CREATE TABLE "emergency_contacts" (
    "id"                         UUID         NOT NULL,
    "monitoring_relationship_id" UUID         NOT NULL,
    "name"                       TEXT         NOT NULL,
    "phone_number"               TEXT         NOT NULL,
    "relationship"               TEXT,
    "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                 TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- 1:1 保証 (1 見守り関係につき緊急連絡先は 1 件のみ)
CREATE UNIQUE INDEX "emergency_contacts_monitoring_relationship_id_key"
    ON "emergency_contacts"("monitoring_relationship_id");

-- FK → monitoring_relationships
ALTER TABLE "emergency_contacts"
    ADD CONSTRAINT "emergency_contacts_monitoring_relationship_id_fkey"
    FOREIGN KEY ("monitoring_relationship_id")
    REFERENCES "monitoring_relationships"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
