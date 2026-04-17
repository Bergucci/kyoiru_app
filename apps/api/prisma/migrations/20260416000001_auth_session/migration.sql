-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3-1: Auth session baseline
-- auth_identities に password_hash 追加
-- refresh_tokens テーブル追加
-- ─────────────────────────────────────────────────────────────────────────────

-- AlterTable: auth_identities に password_hash (nullable) を追加
-- email プロバイダ専用。OAuth プロバイダは NULL を保持する
ALTER TABLE "auth_identities" ADD COLUMN "password_hash" TEXT;

-- CreateTable: refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: token_hash はクライアント提示値のルックアップに使う
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex: userId 単位の一覧取得・無効化に使う
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
