ALTER TABLE "users"
ADD COLUMN "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'local',
ADD COLUMN "google_id" VARCHAR(255),
ADD COLUMN "google_email" VARCHAR(255),
ADD COLUMN "google_picture" TEXT;

CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
CREATE INDEX "users_auth_provider_idx" ON "users"("auth_provider");
