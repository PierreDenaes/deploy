-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "avatar_url" TEXT,
    "email_verified" BOOLEAN DEFAULT false,
    "has_completed_onboarding" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "action_type" VARCHAR(50) NOT NULL,
    "table_name" VARCHAR(50),
    "record_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "summary_date" DATE NOT NULL,
    "total_protein" DECIMAL(8,2) DEFAULT 0,
    "total_calories" INTEGER DEFAULT 0,
    "total_carbs" DECIMAL(8,2) DEFAULT 0,
    "total_fat" DECIMAL(8,2) DEFAULT 0,
    "total_fiber" DECIMAL(6,2) DEFAULT 0,
    "total_meals" INTEGER DEFAULT 0,
    "morning_meals" INTEGER DEFAULT 0,
    "afternoon_meals" INTEGER DEFAULT 0,
    "evening_meals" INTEGER DEFAULT 0,
    "night_meals" INTEGER DEFAULT 0,
    "protein_goal" INTEGER NOT NULL,
    "calorie_goal" INTEGER,
    "protein_goal_met" BOOLEAN DEFAULT false,
    "calorie_goal_met" BOOLEAN DEFAULT false,
    "protein_goal_percentage" DECIMAL(5,2) DEFAULT 0,
    "calorie_goal_percentage" DECIMAL(5,2) DEFAULT 0,
    "ai_assisted_meals" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_exports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "export_format" VARCHAR(10) NOT NULL,
    "date_range_start" DATE NOT NULL,
    "date_range_end" DATE NOT NULL,
    "include_meals" BOOLEAN DEFAULT true,
    "include_favorites" BOOLEAN DEFAULT true,
    "include_summary" BOOLEAN DEFAULT true,
    "include_personal_info" BOOLEAN DEFAULT true,
    "total_records" INTEGER,
    "file_size_bytes" BIGINT,
    "export_status" VARCHAR(20) DEFAULT 'pending',
    "filename" VARCHAR(255),
    "download_url" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "data_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_preferences_reference" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "common" BOOLEAN DEFAULT false,

    CONSTRAINT "dietary_preferences_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_meals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "protein_grams" DECIMAL(6,2) NOT NULL,
    "calories" INTEGER,
    "carbs_grams" DECIMAL(6,2),
    "fat_grams" DECIMAL(6,2),
    "use_count" INTEGER DEFAULT 0,
    "last_used_at" TIMESTAMPTZ(6),
    "tags" TEXT[],
    "photo_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_analyses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "meal_entry_id" UUID,
    "user_id" UUID NOT NULL,
    "input_text" TEXT,
    "input_type" VARCHAR(20) NOT NULL,
    "detected_foods" TEXT[],
    "confidence_score" DECIMAL(3,2) NOT NULL,
    "confidence_level" VARCHAR(20) NOT NULL,
    "estimated_protein" DECIMAL(6,2),
    "estimated_calories" INTEGER,
    "estimated_completeness" DECIMAL(3,2),
    "suggestions" TEXT[],
    "breakdown" JSONB,
    "processing_time_ms" INTEGER,
    "ai_model_version" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_entries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "meal_timestamp" TIMESTAMPTZ(6) NOT NULL,
    "protein_grams" DECIMAL(6,2) NOT NULL,
    "calories" INTEGER,
    "carbs_grams" DECIMAL(6,2),
    "fat_grams" DECIMAL(6,2),
    "fiber_grams" DECIMAL(5,2),
    "source_type" VARCHAR(20) DEFAULT 'manual',
    "ai_estimated" BOOLEAN DEFAULT false,
    "photo_url" TEXT,
    "photo_data" TEXT,
    "tags" TEXT[],
    "meal_type" VARCHAR(20),
    "meal_time_category" VARCHAR(20) DEFAULT 'other',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_migrations" (
    "version" VARCHAR(14) NOT NULL,
    "applied_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "height_cm" INTEGER,
    "age" INTEGER,
    "gender" VARCHAR(20),
    "body_fat_percentage" DECIMAL(4,1),
    "daily_protein_goal" INTEGER NOT NULL DEFAULT 120,
    "daily_calorie_goal" INTEGER DEFAULT 2000,
    "activity_level" VARCHAR(20) NOT NULL DEFAULT 'moderate',
    "fitness_goal" VARCHAR(50) DEFAULT 'maintain',
    "training_days_per_week" INTEGER DEFAULT 3,
    "preferred_units" VARCHAR(10) DEFAULT 'metric',
    "diet_preferences" TEXT[],
    "dark_mode" BOOLEAN DEFAULT false,
    "notifications_enabled" BOOLEAN DEFAULT true,
    "share_data" BOOLEAN DEFAULT false,
    "allow_analytics" BOOLEAN DEFAULT true,
    "reduced_motion" BOOLEAN DEFAULT false,
    "high_contrast" BOOLEAN DEFAULT false,
    "large_text" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_activity_logs_action_type" ON "activity_logs"("action_type");

-- CreateIndex
CREATE INDEX "idx_activity_logs_created_at" ON "activity_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_logs_table_record" ON "activity_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "idx_activity_logs_user_id" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_daily_summaries_date" ON "daily_summaries"("summary_date" DESC);

-- CreateIndex
CREATE INDEX "idx_daily_summaries_goal_met" ON "daily_summaries"("protein_goal_met");

-- CreateIndex
CREATE INDEX "idx_daily_summaries_user_date" ON "daily_summaries"("user_id", "summary_date" DESC);

-- CreateIndex
CREATE INDEX "idx_daily_summaries_user_id" ON "daily_summaries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summaries_user_id_summary_date_key" ON "daily_summaries"("user_id", "summary_date");

-- CreateIndex
CREATE INDEX "idx_data_exports_created_at" ON "data_exports"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_data_exports_status" ON "data_exports"("export_status");

-- CreateIndex
CREATE INDEX "idx_data_exports_user_id" ON "data_exports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_preferences_reference_name_key" ON "dietary_preferences_reference"("name");

-- CreateIndex
CREATE INDEX "idx_favorite_meals_last_used" ON "favorite_meals"("last_used_at" DESC);

-- CreateIndex
CREATE INDEX "idx_favorite_meals_name_search" ON "favorite_meals" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_favorite_meals_use_count" ON "favorite_meals"("use_count" DESC);

-- CreateIndex
CREATE INDEX "idx_favorite_meals_user_id" ON "favorite_meals"("user_id");

-- CreateIndex
CREATE INDEX "idx_meal_analyses_confidence" ON "meal_analyses"("confidence_level");

-- CreateIndex
CREATE INDEX "idx_meal_analyses_created_at" ON "meal_analyses"("created_at");

-- CreateIndex
CREATE INDEX "idx_meal_analyses_input_type" ON "meal_analyses"("input_type");

-- CreateIndex
CREATE INDEX "idx_meal_analyses_meal_entry" ON "meal_analyses"("meal_entry_id");

-- CreateIndex
CREATE INDEX "idx_meal_analyses_user_id" ON "meal_analyses"("user_id");

-- CreateIndex
CREATE INDEX "idx_meal_entries_meal_type" ON "meal_entries"("meal_type");

-- CreateIndex
CREATE INDEX "idx_meal_entries_source" ON "meal_entries"("source_type");

-- CreateIndex
CREATE INDEX "idx_meal_entries_tags" ON "meal_entries" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "idx_meal_entries_timestamp" ON "meal_entries"("meal_timestamp");

-- CreateIndex
CREATE INDEX "idx_meal_entries_user_id" ON "meal_entries"("user_id");

-- CreateIndex
CREATE INDEX "idx_meal_entries_user_timestamp" ON "meal_entries"("user_id", "meal_timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favorite_meals" ADD CONSTRAINT "favorite_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meal_analyses" ADD CONSTRAINT "meal_analyses_meal_entry_id_fkey" FOREIGN KEY ("meal_entry_id") REFERENCES "meal_entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meal_analyses" ADD CONSTRAINT "meal_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
