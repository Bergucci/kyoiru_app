-- ─────────────────────────────────────────────────────────────────────────────
-- Step 7-1: monitoring_relationships
-- 見守り同意フローの正本テーブル
-- watcher (有料プラン必須) → pending → target 同意 → active
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
-- pending   = watcher がリクエスト送信済み・target 未応答
-- active    = target が同意済み (見守り有効)
-- rejected  = target が拒否
-- cancelled = watcher がリクエストを取消
-- revoked   = target が同意を撤回 (即停止)
-- stopped   = 課金切れ / block 等による強制停止
CREATE TYPE "MonitoringRelationshipStatus" AS ENUM (
  'pending',
  'active',
  'rejected',
  'cancelled',
  'revoked',
  'stopped'
);

-- CreateTable
CREATE TABLE "monitoring_relationships" (
    "id"              UUID NOT NULL,
    "watcher_user_id" UUID NOT NULL,
    "target_user_id"  UUID NOT NULL,
    "status"          "MonitoringRelationshipStatus" NOT NULL DEFAULT 'pending',
    "requested_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at"    TIMESTAMP(3),
    "activated_at"    TIMESTAMP(3),
    "cancelled_at"    TIMESTAMP(3),
    "rejected_at"     TIMESTAMP(3),
    "revoked_at"      TIMESTAMP(3),
    "stopped_at"      TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_relationships_pkey" PRIMARY KEY ("id")
);

-- ─── 重複防止 ────────────────────────────────────────────────────────────────
-- (watcher, target) ペアで pending / active が同時に 1 件のみ許可する部分ユニークインデックス
-- Prisma はスキーマで部分インデックスを表現できないため手動で追加する
CREATE UNIQUE INDEX "uq_monitoring_relationships_open"
    ON "monitoring_relationships"("watcher_user_id", "target_user_id")
    WHERE status IN ('pending', 'active');

-- ─── 通常インデックス ─────────────────────────────────────────────────────────
-- watcher / target 軸それぞれからの検索を最適化する
CREATE INDEX "monitoring_relationships_watcher_target_idx"
    ON "monitoring_relationships"("watcher_user_id", "target_user_id");

CREATE INDEX "monitoring_relationships_target_status_idx"
    ON "monitoring_relationships"("target_user_id", "status");

CREATE INDEX "monitoring_relationships_watcher_status_idx"
    ON "monitoring_relationships"("watcher_user_id", "status");

-- ─── 外部キー ─────────────────────────────────────────────────────────────────
ALTER TABLE "monitoring_relationships"
    ADD CONSTRAINT "monitoring_relationships_watcher_user_id_fkey"
    FOREIGN KEY ("watcher_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "monitoring_relationships"
    ADD CONSTRAINT "monitoring_relationships_target_user_id_fkey"
    FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
