-- DynProt App - Complete PostgreSQL Database Schema
-- Generated from frontend component analysis
-- Supports protein tracking, AI analysis, goals, and data export

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostgreSQL specific features
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (Authentication & Basic Profile)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- User Profiles table (Extended User Data & Settings)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Physical characteristics
    weight_kg DECIMAL(5,2),
    height_cm INTEGER,
    age INTEGER,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    body_fat_percentage DECIMAL(4,1),
    
    -- Goals and targets
    daily_protein_goal INTEGER NOT NULL DEFAULT 120,
    daily_calorie_goal INTEGER DEFAULT 2000,
    activity_level VARCHAR(20) NOT NULL DEFAULT 'moderate' 
        CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very_active', 'extremely_active')),
    fitness_goal VARCHAR(50) DEFAULT 'maintain'
        CHECK (fitness_goal IN ('lose_weight', 'maintain', 'gain_muscle', 'bulk', 'cut')),
    training_days_per_week INTEGER DEFAULT 3 CHECK (training_days_per_week >= 0 AND training_days_per_week <= 7),
    
    -- Preferences
    preferred_units VARCHAR(10) DEFAULT 'metric' CHECK (preferred_units IN ('metric', 'imperial')),
    diet_preferences TEXT[], -- Array of dietary preferences/restrictions
    
    -- App preferences
    dark_mode BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    
    -- Privacy settings
    share_data BOOLEAN DEFAULT FALSE,
    allow_analytics BOOLEAN DEFAULT TRUE,
    
    -- Accessibility settings
    reduced_motion BOOLEAN DEFAULT FALSE,
    high_contrast BOOLEAN DEFAULT FALSE,
    large_text BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Meal Entries table (Primary Nutrition Tracking Data)
CREATE TABLE meal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Meal information
    description TEXT NOT NULL,
    meal_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Nutritional content
    protein_grams DECIMAL(6,2) NOT NULL CHECK (protein_grams >= 0),
    calories INTEGER CHECK (calories >= 0),
    carbs_grams DECIMAL(6,2) CHECK (carbs_grams >= 0),
    fat_grams DECIMAL(6,2) CHECK (fat_grams >= 0),
    fiber_grams DECIMAL(5,2) CHECK (fiber_grams >= 0),
    
    -- Metadata
    source_type VARCHAR(20) DEFAULT 'manual' 
        CHECK (source_type IN ('manual', 'voice', 'text', 'image', 'ai_scan', 'favorite', 'import')),
    ai_estimated BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    photo_data TEXT, -- Base64 encoded image data if stored locally
    
    -- Tags and categorization
    tags TEXT[], -- Array of user-defined tags
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
    
    -- Meal timing
    meal_time_category VARCHAR(20) DEFAULT 'other'
        CHECK (meal_time_category IN ('morning', 'afternoon', 'evening', 'night', 'other')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Favorite Meals table (Meal Templates for Quick Entry)
CREATE TABLE favorite_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Template information
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Nutritional template
    protein_grams DECIMAL(6,2) NOT NULL CHECK (protein_grams >= 0),
    calories INTEGER CHECK (calories >= 0),
    carbs_grams DECIMAL(6,2) CHECK (carbs_grams >= 0),
    fat_grams DECIMAL(6,2) CHECK (fat_grams >= 0),
    
    -- Usage statistics
    use_count INTEGER DEFAULT 0 CHECK (use_count >= 0),
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[],
    photo_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AI ANALYSIS TABLES
-- =====================================================

-- Meal Analyses table (AI Analysis Results)
CREATE TABLE meal_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_entry_id UUID REFERENCES meal_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Analysis input
    input_text TEXT,
    input_type VARCHAR(20) NOT NULL CHECK (input_type IN ('voice', 'text', 'image')),
    
    -- AI results
    detected_foods TEXT[] NOT NULL, -- Array of detected food items
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),
    
    -- Nutritional analysis
    estimated_protein DECIMAL(6,2) CHECK (estimated_protein >= 0),
    estimated_calories INTEGER CHECK (estimated_calories >= 0),
    estimated_completeness DECIMAL(3,2) CHECK (estimated_completeness >= 0 AND estimated_completeness <= 1),
    
    -- AI suggestions and feedback
    suggestions TEXT[],
    breakdown JSONB, -- Detailed breakdown of food items and their nutrition
    
    -- Processing metadata
    processing_time_ms INTEGER,
    ai_model_version VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AGGREGATION TABLES
-- =====================================================

-- Daily Summaries table (Pre-calculated Daily Data for Performance)
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    
    -- Daily totals
    total_protein DECIMAL(8,2) DEFAULT 0 CHECK (total_protein >= 0),
    total_calories INTEGER DEFAULT 0 CHECK (total_calories >= 0),
    total_carbs DECIMAL(8,2) DEFAULT 0 CHECK (total_carbs >= 0),
    total_fat DECIMAL(8,2) DEFAULT 0 CHECK (total_fat >= 0),
    total_fiber DECIMAL(6,2) DEFAULT 0 CHECK (total_fiber >= 0),
    
    -- Meal counts
    total_meals INTEGER DEFAULT 0 CHECK (total_meals >= 0),
    morning_meals INTEGER DEFAULT 0 CHECK (morning_meals >= 0),
    afternoon_meals INTEGER DEFAULT 0 CHECK (afternoon_meals >= 0),
    evening_meals INTEGER DEFAULT 0 CHECK (evening_meals >= 0),
    night_meals INTEGER DEFAULT 0 CHECK (night_meals >= 0),
    
    -- Goal achievements
    protein_goal INTEGER NOT NULL,
    calorie_goal INTEGER,
    protein_goal_met BOOLEAN DEFAULT FALSE,
    calorie_goal_met BOOLEAN DEFAULT FALSE,
    protein_goal_percentage DECIMAL(5,2) DEFAULT 0,
    calorie_goal_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- AI usage statistics
    ai_assisted_meals INTEGER DEFAULT 0 CHECK (ai_assisted_meals >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, summary_date)
);

-- =====================================================
-- AUDIT & EXPORT TABLES
-- =====================================================

-- Data Exports table (Export Tracking and Audit)
CREATE TABLE data_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Export configuration
    export_format VARCHAR(10) NOT NULL CHECK (export_format IN ('csv', 'pdf', 'json')),
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    
    -- Included data types
    include_meals BOOLEAN DEFAULT TRUE,
    include_favorites BOOLEAN DEFAULT TRUE,
    include_summary BOOLEAN DEFAULT TRUE,
    include_personal_info BOOLEAN DEFAULT TRUE,
    
    -- Export metadata
    total_records INTEGER,
    file_size_bytes BIGINT,
    export_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (export_status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- File information
    filename VARCHAR(255),
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Activity Log table (User Action Audit Trail)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity information
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- User Profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Meal Entries indexes (Critical for performance)
CREATE INDEX idx_meal_entries_user_id ON meal_entries(user_id);
CREATE INDEX idx_meal_entries_timestamp ON meal_entries(meal_timestamp);
CREATE INDEX idx_meal_entries_user_timestamp ON meal_entries(user_id, meal_timestamp DESC);
CREATE INDEX idx_meal_entries_date ON meal_entries(user_id, DATE(meal_timestamp));
CREATE INDEX idx_meal_entries_source ON meal_entries(source_type);
CREATE INDEX idx_meal_entries_ai_estimated ON meal_entries(ai_estimated) WHERE ai_estimated = TRUE;
CREATE INDEX idx_meal_entries_tags ON meal_entries USING GIN(tags);
CREATE INDEX idx_meal_entries_meal_type ON meal_entries(meal_type);

-- Favorite Meals indexes
CREATE INDEX idx_favorite_meals_user_id ON favorite_meals(user_id);
CREATE INDEX idx_favorite_meals_use_count ON favorite_meals(use_count DESC);
CREATE INDEX idx_favorite_meals_last_used ON favorite_meals(last_used_at DESC);
CREATE INDEX idx_favorite_meals_name_search ON favorite_meals USING GIN(name gin_trgm_ops);

-- Meal Analyses indexes
CREATE INDEX idx_meal_analyses_user_id ON meal_analyses(user_id);
CREATE INDEX idx_meal_analyses_meal_entry ON meal_analyses(meal_entry_id);
CREATE INDEX idx_meal_analyses_confidence ON meal_analyses(confidence_level);
CREATE INDEX idx_meal_analyses_input_type ON meal_analyses(input_type);
CREATE INDEX idx_meal_analyses_created_at ON meal_analyses(created_at);

-- Daily Summaries indexes (Critical for dashboard performance)
CREATE INDEX idx_daily_summaries_user_id ON daily_summaries(user_id);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(summary_date DESC);
CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, summary_date DESC);
CREATE INDEX idx_daily_summaries_goal_met ON daily_summaries(protein_goal_met);

-- Data Exports indexes
CREATE INDEX idx_data_exports_user_id ON data_exports(user_id);
CREATE INDEX idx_data_exports_created_at ON data_exports(created_at DESC);
CREATE INDEX idx_data_exports_status ON data_exports(export_status);

-- Activity Logs indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_table_record ON activity_logs(table_name, record_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER trigger_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_meal_entries_updated_at 
    BEFORE UPDATE ON meal_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_favorite_meals_updated_at 
    BEFORE UPDATE ON favorite_meals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_daily_summaries_updated_at 
    BEFORE UPDATE ON daily_summaries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS FOR DAILY SUMMARY MAINTENANCE
-- =====================================================

-- Function to update or create daily summary for a user and date
CREATE OR REPLACE FUNCTION update_daily_summary(target_user_id UUID, target_date DATE)
RETURNS VOID AS $$
DECLARE
    protein_goal_val INTEGER;
    calorie_goal_val INTEGER;
BEGIN
    -- Get user's current goals
    SELECT daily_protein_goal, COALESCE(daily_calorie_goal, 2000)
    INTO protein_goal_val, calorie_goal_val
    FROM user_profiles 
    WHERE user_id = target_user_id;
    
    -- If no profile found, use defaults
    IF protein_goal_val IS NULL THEN
        protein_goal_val := 120;
        calorie_goal_val := 2000;
    END IF;
    
    -- Update or insert daily summary
    INSERT INTO daily_summaries (
        user_id, summary_date, protein_goal, calorie_goal,
        total_protein, total_calories, total_carbs, total_fat, total_fiber,
        total_meals, morning_meals, afternoon_meals, evening_meals, night_meals,
        ai_assisted_meals, protein_goal_met, calorie_goal_met, 
        protein_goal_percentage, calorie_goal_percentage
    )
    SELECT 
        target_user_id,
        target_date,
        protein_goal_val,
        calorie_goal_val,
        COALESCE(SUM(protein_grams), 0),
        COALESCE(SUM(calories), 0),
        COALESCE(SUM(carbs_grams), 0),
        COALESCE(SUM(fat_grams), 0),
        COALESCE(SUM(fiber_grams), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE meal_time_category = 'morning'),
        COUNT(*) FILTER (WHERE meal_time_category = 'afternoon'),
        COUNT(*) FILTER (WHERE meal_time_category = 'evening'),
        COUNT(*) FILTER (WHERE meal_time_category = 'night'),
        COUNT(*) FILTER (WHERE ai_estimated = TRUE),
        COALESCE(SUM(protein_grams), 0) >= protein_goal_val,
        CASE WHEN calorie_goal_val > 0 THEN COALESCE(SUM(calories), 0) >= calorie_goal_val ELSE TRUE END,
        CASE WHEN protein_goal_val > 0 THEN (COALESCE(SUM(protein_grams), 0) / protein_goal_val * 100) ELSE 0 END,
        CASE WHEN calorie_goal_val > 0 THEN (COALESCE(SUM(calories), 0) / calorie_goal_val * 100) ELSE 0 END
    FROM meal_entries 
    WHERE user_id = target_user_id 
    AND DATE(meal_timestamp) = target_date
    ON CONFLICT (user_id, summary_date) DO UPDATE SET
        total_protein = EXCLUDED.total_protein,
        total_calories = EXCLUDED.total_calories,
        total_carbs = EXCLUDED.total_carbs,
        total_fat = EXCLUDED.total_fat,
        total_fiber = EXCLUDED.total_fiber,
        total_meals = EXCLUDED.total_meals,
        morning_meals = EXCLUDED.morning_meals,
        afternoon_meals = EXCLUDED.afternoon_meals,
        evening_meals = EXCLUDED.evening_meals,
        night_meals = EXCLUDED.night_meals,
        ai_assisted_meals = EXCLUDED.ai_assisted_meals,
        protein_goal = EXCLUDED.protein_goal,
        calorie_goal = EXCLUDED.calorie_goal,
        protein_goal_met = EXCLUDED.protein_goal_met,
        calorie_goal_met = EXCLUDED.calorie_goal_met,
        protein_goal_percentage = EXCLUDED.protein_goal_percentage,
        calorie_goal_percentage = EXCLUDED.calorie_goal_percentage,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update daily summaries when meals are inserted/updated/deleted
CREATE OR REPLACE FUNCTION trigger_update_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_daily_summary(OLD.user_id, DATE(OLD.meal_timestamp));
        RETURN OLD;
    ELSE
        PERFORM update_daily_summary(NEW.user_id, DATE(NEW.meal_timestamp));
        -- If updating and date changed, update old date too
        IF TG_OP = 'UPDATE' AND DATE(OLD.meal_timestamp) != DATE(NEW.meal_timestamp) THEN
            PERFORM update_daily_summary(OLD.user_id, DATE(OLD.meal_timestamp));
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_meal_entries_daily_summary
    AFTER INSERT OR UPDATE OR DELETE ON meal_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

-- =====================================================
-- DATA INTEGRITY CONSTRAINTS
-- =====================================================

-- Additional constraints for data integrity
ALTER TABLE meal_entries ADD CONSTRAINT check_meal_timestamp_not_future 
    CHECK (meal_timestamp <= CURRENT_TIMESTAMP + INTERVAL '1 hour');

ALTER TABLE daily_summaries ADD CONSTRAINT check_summary_date_not_future 
    CHECK (summary_date <= CURRENT_DATE);

ALTER TABLE data_exports ADD CONSTRAINT check_export_date_range 
    CHECK (date_range_start <= date_range_end);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Core user authentication and basic profile information';
COMMENT ON TABLE user_profiles IS 'Extended user data including goals, preferences, and settings';
COMMENT ON TABLE meal_entries IS 'Individual meal records with nutritional information and metadata';
COMMENT ON TABLE favorite_meals IS 'Meal templates for quick entry and user convenience';
COMMENT ON TABLE meal_analyses IS 'AI analysis results and processing metadata for meal entries';
COMMENT ON TABLE daily_summaries IS 'Pre-calculated daily nutrition summaries for performance optimization';
COMMENT ON TABLE data_exports IS 'Export request tracking and audit trail';
COMMENT ON TABLE activity_logs IS 'User action audit trail for security and debugging';

COMMENT ON FUNCTION update_daily_summary(UUID, DATE) IS 'Updates or creates daily summary for specified user and date';
COMMENT ON FUNCTION trigger_update_daily_summary() IS 'Automatically maintains daily summaries when meals are modified';

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Create initial admin user (optional)
-- INSERT INTO users (email, username, password_hash, first_name, is_active, email_verified, has_completed_onboarding)
-- VALUES ('admin@dynprot.app', 'admin', '$2b$12$placeholder_hash_here', 'Admin', TRUE, TRUE, TRUE);

-- Create sample dietary preferences for reference
-- These can be used as suggestions in the UI
CREATE TABLE dietary_preferences_reference (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    common BOOLEAN DEFAULT FALSE
);

INSERT INTO dietary_preferences_reference (name, description, common) VALUES
    ('vegetarian', 'No meat or fish', TRUE),
    ('vegan', 'No animal products', TRUE),
    ('pescatarian', 'No meat except fish', TRUE),
    ('keto', 'Very low carb, high fat', TRUE),
    ('paleo', 'Whole foods, no processed', FALSE),
    ('gluten-free', 'No gluten-containing grains', TRUE),
    ('dairy-free', 'No dairy products', TRUE),
    ('low-sodium', 'Reduced sodium intake', FALSE),
    ('diabetic', 'Diabetes-friendly options', FALSE),
    ('halal', 'Islamic dietary laws', FALSE),
    ('kosher', 'Jewish dietary laws', FALSE);

COMMENT ON TABLE dietary_preferences_reference IS 'Reference table for common dietary preferences and restrictions';

-- =====================================================
-- SCHEMA VERSION AND MIGRATION TRACKING
-- =====================================================

CREATE TABLE schema_migrations (
    version VARCHAR(14) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES ('20240702_001_initial_schema');

COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations for version control';

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Final verification queries (can be removed in production)
/*
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    typname as data_type
FROM pg_tables t
JOIN pg_attribute a ON a.attrelid = (
    SELECT c.oid FROM pg_class c 
    WHERE c.relname = t.tablename AND c.relnamespace = (
        SELECT n.oid FROM pg_namespace n WHERE n.nspname = t.schemaname
    )
)
JOIN pg_type ty ON ty.oid = a.atttypid
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'user_profiles', 'meal_entries', 'favorite_meals', 'meal_analyses', 'daily_summaries')
    AND a.attnum > 0 
    AND NOT a.attisdropped
ORDER BY tablename, a.attnum;
*/