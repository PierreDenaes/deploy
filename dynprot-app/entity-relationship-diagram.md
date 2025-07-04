# DynProt App - Entity Relationship Diagram

## Visual Schema Overview

```
                                    DYNPROT APP DATABASE SCHEMA
                                         Entity Relationships
                                    
    ┌─────────────────┐      1:1     ┌─────────────────┐
    │     USERS       │◄────────────►│ USER_PROFILES   │
    │                 │              │                 │
    │ • id (PK)       │              │ • id (PK)       │
    │ • email (UQ)    │              │ • user_id (FK)  │
    │ • username (UQ) │              │ • weight_kg     │
    │ • password_hash │              │ • height_cm     │
    │ • first_name    │              │ • daily_protein │
    │ • last_name     │              │ • daily_calorie │
    │ • avatar_url    │              │ • activity_level│
    │ • email_verified│              │ • dark_mode     │
    │ • onboarding    │              │ • preferences   │
    │ • created_at    │              │ • privacy       │
    └─────────────────┘              └─────────────────┘
             │                                │
             │ 1:N                            │
             ▼                                ▼
    ┌─────────────────┐              ┌─────────────────┐
    │  MEAL_ENTRIES   │              │ FAVORITE_MEALS  │
    │                 │              │                 │
    │ • id (PK)       │              │ • id (PK)       │
    │ • user_id (FK)  │              │ • user_id (FK)  │
    │ • description   │              │ • name          │
    │ • meal_timestamp│              │ • description   │
    │ • protein_grams │              │ • protein_grams │
    │ • calories      │              │ • calories      │
    │ • source_type   │              │ • use_count     │
    │ • ai_estimated  │              │ • last_used_at │
    │ • photo_url     │              │ • tags[]        │
    │ • tags[]        │              │ • created_at    │
    │ • meal_type     │              └─────────────────┘
    │ • created_at    │
    └─────────────────┘
             │
             │ 1:1
             ▼
    ┌─────────────────┐
    │ MEAL_ANALYSES   │
    │                 │
    │ • id (PK)       │
    │ • meal_entry_id │
    │ • user_id (FK)  │
    │ • input_text    │
    │ • input_type    │
    │ • detected_foods│
    │ • confidence    │
    │ • estimated_*   │
    │ • suggestions[] │
    │ • breakdown     │
    │ • ai_model_ver  │
    └─────────────────┘
```

## Aggregation & Audit Tables

```
    ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
    │     USERS       │              │ DAILY_SUMMARIES │              │  DATA_EXPORTS   │
    │                 │              │                 │              │                 │
    │ • id (PK)       │─────────────►│ • id (PK)       │◄─────────────│ • id (PK)       │
    └─────────────────┘     1:N      │ • user_id (FK)  │     1:N      │ • user_id (FK)  │
                                     │ • summary_date  │              │ • export_format │
                                     │ • total_protein │              │ • date_range    │
                                     │ • total_calories│              │ • include_*     │
                                     │ • total_meals   │              │ • total_records │
                                     │ • morning_meals │              │ • file_size     │
                                     │ • protein_goal  │              │ • export_status │
                                     │ • goal_met      │              │ • filename      │
                                     │ • ai_assisted   │              │ • created_at    │
                                     └─────────────────┘              └─────────────────┘
                                              ▲                                │
                                              │                                │
                                              │ Aggregated from               │ 1:N
                                              │                                ▼
                                     ┌─────────────────┐              ┌─────────────────┐
                                     │  MEAL_ENTRIES   │              │ ACTIVITY_LOGS   │
                                     │                 │              │                 │
                                     │ • meal_timestamp│              │ • id (PK)       │
                                     │ • protein_grams │              │ • user_id (FK)  │
                                     │ • calories      │              │ • action_type   │
                                     │ • user_id (FK)  │              │ • table_name    │
                                     └─────────────────┘              │ • record_id     │
                                                                      │ • old_values    │
                                                                      │ • new_values    │
                                                                      │ • ip_address    │
                                                                      │ • created_at    │
                                                                      └─────────────────┘
```

## Detailed Relationship Descriptions

### Primary Relationships (1:1 and 1:N)

#### **USERS ↔ USER_PROFILES** (1:1)
- **Relationship**: One-to-one mandatory
- **Purpose**: Separate authentication from profile data
- **Key**: `user_profiles.user_id` → `users.id`
- **Cascade**: DELETE CASCADE (profile deleted when user deleted)
- **Constraints**: UNIQUE constraint on user_id

#### **USERS → MEAL_ENTRIES** (1:N)
- **Relationship**: One-to-many
- **Purpose**: User owns all their meal records
- **Key**: `meal_entries.user_id` → `users.id`
- **Cascade**: DELETE CASCADE (all meals deleted when user deleted)
- **Indexes**: 
  - `idx_meal_entries_user_id` for user lookups
  - `idx_meal_entries_user_timestamp` for chronological queries

#### **USERS → FAVORITE_MEALS** (1:N)
- **Relationship**: One-to-many
- **Purpose**: User owns their favorite meal templates
- **Key**: `favorite_meals.user_id` → `users.id`
- **Cascade**: DELETE CASCADE
- **Features**: Usage tracking with `use_count` and `last_used_at`

### Analysis Relationships

#### **MEAL_ENTRIES ↔ MEAL_ANALYSES** (1:1)
- **Relationship**: One-to-one optional
- **Purpose**: Store AI analysis results for meals
- **Key**: `meal_analyses.meal_entry_id` → `meal_entries.id`
- **Cascade**: DELETE CASCADE (analysis deleted with meal)
- **Note**: Not all meals have analyses (manual entries)

#### **USERS → MEAL_ANALYSES** (1:N)
- **Relationship**: One-to-many
- **Purpose**: Direct user ownership for analytics
- **Key**: `meal_analyses.user_id` → `users.id`
- **Purpose**: Enables user-level AI usage analytics

### Aggregation Relationships

#### **USERS → DAILY_SUMMARIES** (1:N)
- **Relationship**: One-to-many
- **Purpose**: Pre-calculated daily nutrition summaries
- **Key**: `daily_summaries.user_id` → `users.id`
- **Constraints**: UNIQUE(user_id, summary_date)
- **Features**: 
  - Automatically maintained via triggers
  - Optimized for dashboard performance
  - Includes goal tracking and meal timing

#### **MEAL_ENTRIES → DAILY_SUMMARIES** (Aggregation)
- **Relationship**: Many-to-one aggregation
- **Purpose**: Daily summaries calculated from meal entries
- **Implementation**: Automated via `update_daily_summary()` function
- **Triggers**: Automatic update on meal INSERT/UPDATE/DELETE

### Audit Relationships

#### **USERS → DATA_EXPORTS** (1:N)
- **Relationship**: One-to-many
- **Purpose**: Track user data export requests
- **Key**: `data_exports.user_id` → `users.id`
- **Features**: GDPR compliance and export history

#### **USERS → ACTIVITY_LOGS** (1:N)
- **Relationship**: One-to-many optional
- **Purpose**: Audit trail for user actions
- **Key**: `activity_logs.user_id` → `users.id`
- **Features**: Can be NULL for system actions

## Relationship Cardinalities

```
┌──────────────────┬─────────────────┬──────────────┬─────────────────────┐
│ FROM TABLE       │ TO TABLE        │ CARDINALITY  │ RELATIONSHIP TYPE   │
├──────────────────┼─────────────────┼──────────────┼─────────────────────┤
│ users            │ user_profiles   │ 1:1          │ Mandatory           │
│ users            │ meal_entries    │ 1:N          │ Dependent           │
│ users            │ favorite_meals  │ 1:N          │ Dependent           │
│ users            │ meal_analyses   │ 1:N          │ Dependent           │
│ users            │ daily_summaries │ 1:N          │ Derived             │
│ users            │ data_exports    │ 1:N          │ Audit               │
│ users            │ activity_logs   │ 1:N          │ Audit (optional)    │
│ meal_entries     │ meal_analyses   │ 1:1          │ Optional            │
│ meal_entries     │ daily_summaries │ N:1          │ Aggregation         │
└──────────────────┴─────────────────┴──────────────┴─────────────────────┘
```

## Foreign Key Constraints

### Referential Integrity Rules

1. **CASCADE DELETE**:
   - `user_profiles.user_id` → `users.id`
   - `meal_entries.user_id` → `users.id`
   - `favorite_meals.user_id` → `users.id`
   - `meal_analyses.user_id` → `users.id`
   - `daily_summaries.user_id` → `users.id`
   - `data_exports.user_id` → `users.id`
   - `meal_analyses.meal_entry_id` → `meal_entries.id`

2. **SET NULL** (if applicable):
   - `activity_logs.user_id` → `users.id` (for system actions)

### Index Strategy for Relationships

```sql
-- Primary relationship indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_meal_entries_user_id ON meal_entries(user_id);
CREATE INDEX idx_favorite_meals_user_id ON favorite_meals(user_id);
CREATE INDEX idx_meal_analyses_user_id ON meal_analyses(user_id);
CREATE INDEX idx_meal_analyses_meal_entry ON meal_analyses(meal_entry_id);
CREATE INDEX idx_daily_summaries_user_id ON daily_summaries(user_id);
CREATE INDEX idx_data_exports_user_id ON data_exports(user_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);

-- Composite indexes for complex queries
CREATE INDEX idx_meal_entries_user_timestamp ON meal_entries(user_id, meal_timestamp DESC);
CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, summary_date DESC);
CREATE INDEX idx_meal_entries_date ON meal_entries(user_id, DATE(meal_timestamp));
```

## Data Flow Patterns

### Meal Entry Flow
```
User Input → AI Analysis → Meal Entry → Daily Summary Update
     ↓             ↓           ↓              ↓
[UI Components]→[MEAL_ANALYSES]→[MEAL_ENTRIES]→[DAILY_SUMMARIES]
```

### Goal Tracking Flow
```
User Profile → Daily Summary → Progress Calculation → UI Display
     ↓             ↓                ↓                  ↓
[USER_PROFILES]→[DAILY_SUMMARIES]→[Calculated Fields]→[Dashboard]
```

### Data Export Flow
```
Export Request → Data Aggregation → File Generation → Download
       ↓              ↓                   ↓             ↓
[DATA_EXPORTS]→[Multiple Tables]→[Export Utilities]→[File Delivery]
```

## Business Rules Enforced by Relationships

1. **Data Ownership**: All nutrition data belongs to a specific user
2. **Data Consistency**: Daily summaries automatically reflect meal changes
3. **Data Integrity**: Analyses cannot exist without corresponding meals
4. **Privacy**: User deletion cascades to all personal data
5. **Audit Trail**: All significant actions are logged with user context
6. **Goal Tracking**: Daily summaries maintain goal achievement history

## Performance Considerations

### Query Optimization
- **Dashboard queries**: Use `daily_summaries` for fast aggregations
- **Meal history**: Leverage `user_id + timestamp` indexes
- **AI analytics**: Use `meal_analyses` table for AI performance metrics
- **Export queries**: Pre-filter by date ranges using indexes

### Scalability
- **Partitioning potential**: `meal_entries` and `daily_summaries` by date
- **Archival strategy**: Move old data to separate tables
- **Read replicas**: Analytics queries can use read-only replicas
- **Caching**: Daily summaries reduce real-time calculation load