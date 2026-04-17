-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5-3: Daily checkins and mood stamps
-- daily_checkins / daily_mood_stamps 正本追加
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "daily_checkins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_date_jst" TEXT NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_mood_stamps" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_date_jst" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_mood_stamps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_daily_checkins_user_business_date"
    ON "daily_checkins"("user_id", "business_date_jst");

-- CreateIndex
CREATE INDEX "daily_checkins_business_date_jst_idx"
    ON "daily_checkins"("business_date_jst");

-- CreateIndex
CREATE INDEX "daily_checkins_user_id_checked_in_at_idx"
    ON "daily_checkins"("user_id", "checked_in_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daily_mood_stamps_user_business_date"
    ON "daily_mood_stamps"("user_id", "business_date_jst");

-- CreateIndex
CREATE INDEX "daily_mood_stamps_business_date_jst_idx"
    ON "daily_mood_stamps"("business_date_jst");

-- CreateIndex
CREATE INDEX "daily_mood_stamps_user_id_created_at_idx"
    ON "daily_mood_stamps"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_mood_stamps" ADD CONSTRAINT "daily_mood_stamps_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
