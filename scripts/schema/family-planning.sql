ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipient_person_id" TEXT;
ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "person_id" TEXT;
CREATE INDEX IF NOT EXISTS "notifications_family_id_recipient_person_id_read_idx"
  ON "notifications" ("family_id", "recipient_person_id", "read");
CREATE INDEX IF NOT EXISTS "push_subscriptions_family_id_person_id_is_active_idx"
  ON "push_subscriptions" ("family_id", "person_id", "is_active");
