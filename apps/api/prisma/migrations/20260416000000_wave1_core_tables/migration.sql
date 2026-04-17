-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 1: Core tables
-- users / auth_identities / friendship_requests / friendships / user_blocks
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
-- pending  = OAuth 完了直後・プロフィール未入力 (ホーム進入不可)
-- active   = プロフィール設定完了済み
-- deactivated = 退会・利用停止
CREATE TYPE "ProfileStatus" AS ENUM ('pending', 'active', 'deactivated');

-- CreateEnum
-- 仕様の 4 系統認証に対応
CREATE TYPE "AuthProvider" AS ENUM ('apple', 'line', 'google', 'email');

-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- CreateEnum
-- ON/OFF 2 値のみ (friends_only は仕様にないため除外)
CREATE TYPE "IdSearchVisibility" AS ENUM ('public', 'private');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "profile_status" "ProfileStatus" NOT NULL DEFAULT 'pending',
    "id_search_visibility" "IdSearchVisibility" NOT NULL DEFAULT 'public',
    "user_id_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendship_requests" (
    "id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "receiver_user_id" UUID NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_revert_deadline_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendship_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" UUID NOT NULL,
    "user_low_id" UUID NOT NULL,
    "user_high_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blocker_user_id" UUID NOT NULL,
    "blocked_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_auth_identities_provider_subject" ON "auth_identities"("provider", "provider_subject");

-- CreateIndex
-- pending 重複申請禁止: 同一ペアで pending が複数作れないよう部分ユニークインデックス
CREATE UNIQUE INDEX "uq_friendship_requests_pending"
    ON "friendship_requests"("sender_user_id", "receiver_user_id")
    WHERE status = 'pending';

-- CreateIndex
CREATE INDEX "friendship_requests_sender_user_id_receiver_user_id_idx" ON "friendship_requests"("sender_user_id", "receiver_user_id");

-- CreateIndex
CREATE INDEX "friendship_requests_receiver_user_id_status_idx" ON "friendship_requests"("receiver_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_friendships_pair" ON "friendships"("user_low_id", "user_high_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_blocks_pair" ON "user_blocks"("blocker_user_id", "blocked_user_id");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship_requests" ADD CONSTRAINT "friendship_requests_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship_requests" ADD CONSTRAINT "friendship_requests_receiver_user_id_fkey"
    FOREIGN KEY ("receiver_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_low_id_fkey"
    FOREIGN KEY ("user_low_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_high_id_fkey"
    FOREIGN KEY ("user_high_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_user_id_fkey"
    FOREIGN KEY ("blocker_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_fkey"
    FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
