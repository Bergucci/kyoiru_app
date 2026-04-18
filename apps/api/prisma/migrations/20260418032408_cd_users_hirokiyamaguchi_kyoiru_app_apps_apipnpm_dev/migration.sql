-- RenameIndex
ALTER INDEX "account_deletion_requests_purge_180d_after_purge_180d_completed" RENAME TO "account_deletion_requests_purge_180d_after_purge_180d_compl_idx";

-- RenameIndex
ALTER INDEX "account_deletion_requests_purge_24h_after_purge_24h_completed_a" RENAME TO "account_deletion_requests_purge_24h_after_purge_24h_complet_idx";

-- RenameIndex
ALTER INDEX "account_deletion_requests_purge_30d_after_purge_30d_completed_a" RENAME TO "account_deletion_requests_purge_30d_after_purge_30d_complet_idx";

-- RenameIndex
ALTER INDEX "account_deletion_requests_purge_7y_after_purge_7y_completed_at_" RENAME TO "account_deletion_requests_purge_7y_after_purge_7y_completed_idx";

-- RenameIndex
ALTER INDEX "uq_auth_identities_provider_subject" RENAME TO "auth_identities_provider_provider_subject_key";

-- RenameIndex
ALTER INDEX "uq_daily_checkins_user_business_date" RENAME TO "daily_checkins_user_id_business_date_jst_key";

-- RenameIndex
ALTER INDEX "uq_daily_mood_stamps_user_business_date" RENAME TO "daily_mood_stamps_user_id_business_date_jst_key";

-- RenameIndex
ALTER INDEX "idx_free_checkin_reminder_deliveries_business_date_phase" RENAME TO "free_checkin_reminder_deliveries_business_date_jst_phase_idx";

-- RenameIndex
ALTER INDEX "idx_free_checkin_reminder_deliveries_user_created_at" RENAME TO "free_checkin_reminder_deliveries_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "uq_free_checkin_reminder_deliveries_scope" RENAME TO "free_checkin_reminder_deliveries_group_id_user_id_business__key";

-- RenameIndex
ALTER INDEX "uq_friendships_pair" RENAME TO "friendships_user_low_id_user_high_id_key";

-- RenameIndex
ALTER INDEX "uq_group_members_group_user" RENAME TO "group_members_group_id_user_id_key";

-- RenameIndex
ALTER INDEX "monitoring_alert_deliveries_rel_created_at_idx" RENAME TO "monitoring_alert_deliveries_monitoring_relationship_id_crea_idx";

-- RenameIndex
ALTER INDEX "uq_monitoring_alert_deliveries_scope" RENAME TO "monitoring_alert_deliveries_monitoring_relationship_id_busi_key";

-- RenameIndex
ALTER INDEX "monitoring_emergency_contact_views_monitoring_relationship_id_v" RENAME TO "monitoring_emergency_contact_views_monitoring_relationship__idx";

-- RenameIndex
ALTER INDEX "monitoring_emergency_contact_views_watcher_user_id_viewed_at_id" RENAME TO "monitoring_emergency_contact_views_watcher_user_id_viewed_a_idx";

-- RenameIndex
ALTER INDEX "monitoring_relationships_target_status_idx" RENAME TO "monitoring_relationships_target_user_id_status_idx";

-- RenameIndex
ALTER INDEX "monitoring_relationships_watcher_status_idx" RENAME TO "monitoring_relationships_watcher_user_id_status_idx";

-- RenameIndex
ALTER INDEX "monitoring_relationships_watcher_target_idx" RENAME TO "monitoring_relationships_watcher_user_id_target_user_id_idx";

-- RenameIndex
ALTER INDEX "idx_revenuecat_webhook_events_app_user_id_created_at" RENAME TO "revenuecat_webhook_events_app_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_revenuecat_webhook_events_event_type_created_at" RENAME TO "revenuecat_webhook_events_event_type_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_revenuecat_webhook_events_user_id_created_at" RENAME TO "revenuecat_webhook_events_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "uq_user_blocks_pair" RENAME TO "user_blocks_blocker_user_id_blocked_user_id_key";

-- RenameIndex
ALTER INDEX "idx_user_subscription_entitlements_status_updated_at" RENAME TO "user_subscription_entitlements_status_updated_at_idx";

-- RenameIndex
ALTER INDEX "uq_user_subscription_entitlements_user_key" RENAME TO "user_subscription_entitlements_user_id_entitlement_key_key";
