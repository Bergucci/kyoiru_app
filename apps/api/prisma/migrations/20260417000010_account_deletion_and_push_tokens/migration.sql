-- ─────────────────────────────────────────────────────────────────────────────
-- Step 8: account deletion scheduling / push tokens
-- 法務導線と退会運用の最小成立に必要な正本
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── push_tokens ────────────────────────────────────────────────────────────
CREATE TABLE "push_tokens" (
    "id"         UUID NOT NULL,
    "user_id"    UUID NOT NULL,
    "token"      TEXT NOT NULL,
    "platform"   TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_tokens_token_key"
    ON "push_tokens"("token");

CREATE INDEX "push_tokens_user_id_revoked_at_idx"
    ON "push_tokens"("user_id", "revoked_at");

ALTER TABLE "push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── account_deletion_requests ──────────────────────────────────────────────
CREATE TABLE "account_deletion_requests" (
    "id"                       UUID NOT NULL,
    "user_id"                  UUID NOT NULL,
    "requested_at"             TIMESTAMP(3) NOT NULL,
    "immediate_disabled_at"    TIMESTAMP(3) NOT NULL,
    "purge_24h_after"          TIMESTAMP(3) NOT NULL,
    "purge_30d_after"          TIMESTAMP(3) NOT NULL,
    "purge_180d_after"         TIMESTAMP(3) NOT NULL,
    "purge_7y_after"           TIMESTAMP(3) NOT NULL,
    "purge_24h_completed_at"   TIMESTAMP(3),
    "purge_30d_completed_at"   TIMESTAMP(3),
    "purge_180d_completed_at"  TIMESTAMP(3),
    "purge_7y_completed_at"    TIMESTAMP(3),
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_deletion_requests_user_id_key"
    ON "account_deletion_requests"("user_id");

CREATE INDEX "account_deletion_requests_purge_24h_after_purge_24h_completed_at_idx"
    ON "account_deletion_requests"("purge_24h_after", "purge_24h_completed_at");

CREATE INDEX "account_deletion_requests_purge_30d_after_purge_30d_completed_at_idx"
    ON "account_deletion_requests"("purge_30d_after", "purge_30d_completed_at");

CREATE INDEX "account_deletion_requests_purge_180d_after_purge_180d_completed_at_idx"
    ON "account_deletion_requests"("purge_180d_after", "purge_180d_completed_at");

CREATE INDEX "account_deletion_requests_purge_7y_after_purge_7y_completed_at_idx"
    ON "account_deletion_requests"("purge_7y_after", "purge_7y_completed_at");

ALTER TABLE "account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
