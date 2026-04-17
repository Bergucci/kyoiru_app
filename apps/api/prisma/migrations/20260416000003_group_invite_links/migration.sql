-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5-2: Group invite links
-- group_invite_links 正本追加
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "group_invite_links" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_invite_links_token_key" ON "group_invite_links"("token");

-- CreateIndex
CREATE INDEX "group_invite_links_group_id_created_at_idx" ON "group_invite_links"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "group_invite_links_group_id_idx" ON "group_invite_links"("group_id");

-- CreateIndex
CREATE INDEX "group_invite_links_created_by_user_id_idx" ON "group_invite_links"("created_by_user_id");

-- CreateIndex
-- 未使用かつ未 revoke のリンクは group ごとに 1 本だけ保持する
CREATE UNIQUE INDEX "uq_group_invite_links_active_per_group"
    ON "group_invite_links"("group_id")
    WHERE "used_at" IS NULL AND "revoked_at" IS NULL;

-- AddForeignKey
ALTER TABLE "group_invite_links" ADD CONSTRAINT "group_invite_links_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invite_links" ADD CONSTRAINT "group_invite_links_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
