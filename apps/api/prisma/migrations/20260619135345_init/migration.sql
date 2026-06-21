-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presets" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "mode" TEXT NOT NULL,
    "pages_processed" INTEGER NOT NULL,
    "pages_skipped" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "output_size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "error_code" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "mode" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engine_configs" (
    "id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engine_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_versions" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "released_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "presets_user_id_idx" ON "presets"("user_id");

-- CreateIndex
CREATE INDEX "presets_is_public_idx" ON "presets"("is_public");

-- CreateIndex
CREATE INDEX "telemetry_user_id_idx" ON "telemetry"("user_id");

-- CreateIndex
CREATE INDEX "telemetry_created_at_idx" ON "telemetry"("created_at");

-- CreateIndex
CREATE INDEX "error_reports_user_id_idx" ON "error_reports"("user_id");

-- CreateIndex
CREATE INDEX "error_reports_error_code_idx" ON "error_reports"("error_code");

-- CreateIndex
CREATE UNIQUE INDEX "app_versions_version_key" ON "app_versions"("version");

-- AddForeignKey
ALTER TABLE "presets" ADD CONSTRAINT "presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry" ADD CONSTRAINT "telemetry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_reports" ADD CONSTRAINT "error_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
