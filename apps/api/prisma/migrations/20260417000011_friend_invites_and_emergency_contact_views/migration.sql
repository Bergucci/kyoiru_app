-- CreateTable
CREATE TABLE "friend_invite_links" (
    "id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_emergency_contact_views" (
    "id" UUID NOT NULL,
    "monitoring_relationship_id" UUID NOT NULL,
    "watcher_user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_emergency_contact_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "friend_invite_links_token_key" ON "friend_invite_links"("token");

-- CreateIndex
CREATE INDEX "friend_invite_links_created_by_user_id_created_at_idx" ON "friend_invite_links"("created_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "friend_invite_links_created_by_user_id_idx" ON "friend_invite_links"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_friend_invite_links_active_per_user"
    ON "friend_invite_links"("created_by_user_id")
    WHERE "used_at" IS NULL AND "revoked_at" IS NULL;

-- CreateIndex
CREATE INDEX "monitoring_emergency_contact_views_monitoring_relationship_id_viewed_at_idx" ON "monitoring_emergency_contact_views"("monitoring_relationship_id", "viewed_at");

-- CreateIndex
CREATE INDEX "monitoring_emergency_contact_views_watcher_user_id_viewed_at_idx" ON "monitoring_emergency_contact_views"("watcher_user_id", "viewed_at");

-- CreateIndex
CREATE INDEX "monitoring_emergency_contact_views_target_user_id_viewed_at_idx" ON "monitoring_emergency_contact_views"("target_user_id", "viewed_at");

-- AddForeignKey
ALTER TABLE "friend_invite_links" ADD CONSTRAINT "friend_invite_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_emergency_contact_views" ADD CONSTRAINT "monitoring_emergency_contact_views_watcher_user_id_fkey" FOREIGN KEY ("watcher_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
