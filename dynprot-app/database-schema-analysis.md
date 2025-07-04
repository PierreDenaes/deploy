# DynProt App - Database Schema Analysis & Design

## Executive Summary

This document presents a comprehensive relational database schema for the DynProt protein tracking application, derived from frontend component analysis. The schema supports voice/text/image meal input, AI-powered nutrition analysis, goal tracking, data export, and user preferences management.

## Current State Analysis

### Existing Schema (Minimal)
The current Prisma schema contains only basic user authentication:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  firstName String?
  lastName  String?
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Frontend Data Model Analysis

From analyzing the React components, TypeScript interfaces, and data flow patterns, I've identified the following core entities and their relationships:

## Core Entities Identified

### 1. **Users** (Authentication & Core Profile)
**Purpose**: Store user authentication and basic profile information
**Usage**: Login/logout, profile management, data ownership
**Key Fields**: 
- Authentication data (email, password, username)
- Basic profile (firstName, lastName, avatar)
- Account status and verification
- Onboarding completion status

### 2. **UserProfiles** (Extended User Data)
**Purpose**: Store detailed user preferences, goals, and settings
**Usage**: Goal calculation, preference management, app customization
**Key Fields**:
- Physical characteristics (weight, height, age, gender)
- Nutrition goals (protein, calories)
- Activity level and fitness goals
- Unit preferences (metric/imperial)
- App preferences (dark mode, notifications, accessibility)

### 3. **MealEntries** (Primary Nutrition Data)
**Purpose**: Store individual meal records with nutrition information
**Usage**: Daily tracking, progress calculation, history display
**Key Fields**:
- Meal description and nutritional content
- Timestamp and source information
- AI analysis indicators
- Photo/image data
- Tags and categorization

### 4. **FavoriteMeals** (Meal Templates)
**Purpose**: Store frequently used meals as quick-entry templates
**Usage**: Rapid meal entry, user convenience, pattern recognition
**Key Fields**:
- Template name and description
- Nutritional information
- Usage statistics
- User-defined tags

### 5. **MealAnalyses** (AI Analysis Results)
**Purpose**: Store AI analysis results and confidence scores
**Usage**: Meal suggestions, accuracy tracking, AI improvement
**Key Fields**:
- Analysis confidence and breakdown
- Detected foods and suggestions
- Source method (voice, text, image)
- Processing metadata

### 6. **DailySummaries** (Aggregated Daily Data)
**Purpose**: Pre-calculated daily nutrition summaries for performance
**Usage**: Dashboard display, weekly/monthly trend analysis
**Key Fields**:
- Daily totals and goal achievements
- Meal count and timing patterns
- Trend calculations
- Performance metrics

### 7. **DataExports** (Export Tracking)
**Purpose**: Track data export requests and maintain audit trail
**Usage**: Export management, usage analytics, privacy compliance
**Key Fields**:
- Export configuration and date ranges
- File format and included data types
- Export status and metadata

## Entity Relationships

### Primary Relationships
1. **User → UserProfile** (1:1) - Extended profile data
2. **User → MealEntries** (1:many) - User's meal records
3. **User → FavoriteMeals** (1:many) - User's meal templates
4. **User → DailySummaries** (1:many) - Daily aggregated data
5. **User → DataExports** (1:many) - Export history

### Analysis Relationships
6. **MealEntry → MealAnalysis** (1:1) - AI analysis results
7. **MealAnalysis → FavoriteMeal** (many:1) - Template suggestions

### Aggregation Relationships
8. **DailySummary → MealEntries** (1:many) - Daily meal aggregation

## Data Flow Patterns

### Meal Entry Workflow
1. User inputs meal via voice/text/image
2. AI analysis generates `MealAnalysis` record
3. User confirms/edits to create `MealEntry`
4. `DailySummary` updated with new meal data
5. Optional: Meal saved as `FavoriteMeal` template

### Goal Tracking Workflow
1. User sets goals in `UserProfile`
2. Daily meals accumulated in `MealEntries`
3. Progress calculated via `DailySummaries`
4. Trends and insights generated from historical data

### Data Export Workflow
1. User configures export in UI
2. `DataExport` record created with parameters
3. Data aggregated from multiple tables
4. Export file generated and delivered
5. Export completion logged

## Normalization Strategy

The schema follows **Third Normal Form (3NF)** principles:

- **1NF**: All fields contain atomic values, no repeating groups
- **2NF**: All non-key attributes fully depend on primary keys
- **3NF**: No transitive dependencies between non-key attributes

### Denormalization Considerations
- `DailySummaries` table provides controlled denormalization for performance
- Pre-calculated daily totals avoid expensive real-time aggregations
- Trade-off: Storage space vs. query performance for dashboard loads

## Performance Optimization

### Indexing Strategy
- **Primary Keys**: All tables have clustered indexes on ID fields
- **Foreign Keys**: Non-clustered indexes on all foreign key columns
- **Query Optimization**: Indexes on frequently filtered columns (date, user_id)
- **Composite Indexes**: Multi-column indexes for complex queries

### Partitioning Considerations
- `MealEntries` and `DailySummaries` tables can be partitioned by date
- Enables efficient archival and improved query performance
- Supports data retention policies and GDPR compliance

## Security & Privacy

### Data Protection
- Password hashing with bcrypt
- Sensitive data encryption at rest
- User data isolation through proper foreign keys
- Audit trail for data modifications

### GDPR Compliance
- User consent tracking in `UserProfile`
- Data export functionality built-in
- Ability to anonymize or delete user data
- Clear data retention policies

## Scalability Considerations

### Horizontal Scaling
- User-based partitioning possible
- Read replicas for analytics queries
- Separate OLTP and OLAP workloads

### Vertical Scaling
- Optimized for PostgreSQL features
- JSON columns for flexible metadata
- Efficient indexing strategy
- Connection pooling support

## Migration Strategy

### Phase 1: Core Schema Extension
1. Add `UserProfiles` table with current user data migration
2. Create `MealEntries` table structure
3. Implement `FavoriteMeals` table
4. Add necessary indexes and constraints

### Phase 2: Analysis & Aggregation
1. Add `MealAnalyses` table for AI results
2. Create `DailySummaries` table with historical data migration
3. Implement aggregation triggers/procedures

### Phase 3: Audit & Export
1. Add `DataExports` table for export tracking
2. Implement audit logging mechanisms
3. Create data retention procedures

### Data Migration
- Existing `users` table maps to new `User` model
- Current localStorage data can be bulk-imported to new schema
- Gradual migration with fallback to localStorage during transition