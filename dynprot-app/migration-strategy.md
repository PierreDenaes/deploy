# DynProt App - Database Migration Strategy

## Migration Overview

This document outlines the strategy for migrating from the current minimal Prisma schema to the comprehensive database schema designed for the DynProt protein tracking application.

## Current State Assessment

### Existing Schema (Minimal)
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

### Current Data Storage
- **Frontend**: Data stored in localStorage
- **Backend**: Minimal user authentication only
- **Nutrition Data**: Currently frontend-only (not persisted in database)

## Migration Phases

### Phase 1: Core Schema Foundation (Priority: HIGH)
**Timeline**: Week 1
**Risk Level**: LOW

#### 1.1 Extend Users Table
```sql
-- Add new columns to existing users table
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;

-- Update existing users
UPDATE users SET 
  email_verified = TRUE,
  has_completed_onboarding = TRUE,
  is_active = TRUE
WHERE id IN (SELECT id FROM users);
```

#### 1.2 Create User Profiles Table
```sql
-- Create user_profiles table
CREATE TABLE user_profiles (
  -- Schema as defined in main SQL file
);

-- Migrate existing user data to profiles
INSERT INTO user_profiles (user_id, created_at, updated_at)
SELECT id, created_at, updated_at FROM users;
```

#### 1.3 Create Core Nutrition Tables
```sql
-- Create meal_entries table
CREATE TABLE meal_entries (
  -- Full schema as defined
);

-- Create favorite_meals table  
CREATE TABLE favorite_meals (
  -- Full schema as defined
);
```

#### 1.4 Add Essential Indexes
```sql
-- Critical performance indexes
CREATE INDEX idx_meal_entries_user_timestamp ON meal_entries(user_id, meal_timestamp DESC);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_favorite_meals_user_id ON favorite_meals(user_id);
```

### Phase 2: Data Migration from Frontend (Priority: HIGH)
**Timeline**: Week 2
**Risk Level**: MEDIUM

#### 2.1 Prepare Migration Scripts
Create Node.js migration scripts to:
1. Read localStorage data from user sessions
2. Parse and validate nutrition data
3. Map to new database schema
4. Handle data conflicts and duplicates

#### 2.2 User Data Migration Process
```javascript
// Example migration script structure
const migrateUserData = async (userId, localStorageData) => {
  // 1. Migrate user profile data
  await migrateUserProfile(userId, localStorageData.userSettings);
  
  // 2. Migrate meal entries
  await migrateMealEntries(userId, localStorageData.meals);
  
  // 3. Migrate favorite meals
  await migrateFavoriteMeals(userId, localStorageData.favoriteMeals);
  
  // 4. Generate daily summaries
  await generateDailySummaries(userId);
};
```

#### 2.3 Data Validation and Cleanup
- Validate protein/calorie values within reasonable ranges
- Convert timestamps to proper UTC format
- Clean up malformed descriptions
- Remove duplicate entries
- Verify referential integrity

#### 2.4 Rollback Strategy
- Keep localStorage data as backup during migration
- Implement data export before migration starts
- Create migration rollback scripts
- Maintain migration status tracking

### Phase 3: AI Analysis and Aggregation (Priority: MEDIUM)
**Timeline**: Week 3
**Risk Level**: LOW

#### 3.1 AI Analysis Tables
```sql
-- Create meal_analyses table
CREATE TABLE meal_analyses (
  -- Full schema as defined
);

-- Add AI analysis triggers and functions
```

#### 3.2 Daily Summaries Implementation
```sql
-- Create daily_summaries table
CREATE TABLE daily_summaries (
  -- Full schema as defined
);

-- Create and test aggregation functions
CREATE OR REPLACE FUNCTION update_daily_summary(target_user_id UUID, target_date DATE)
-- Function implementation

-- Create triggers for automatic updates
CREATE TRIGGER trigger_meal_entries_daily_summary
    AFTER INSERT OR UPDATE OR DELETE ON meal_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();
```

#### 3.3 Historical Data Processing
- Generate daily summaries for existing meal data
- Calculate historical trends and patterns
- Verify aggregation accuracy
- Performance test with full dataset

### Phase 4: Audit and Export Features (Priority: LOW)  
**Timeline**: Week 4
**Risk Level**: LOW

#### 4.1 Audit Infrastructure
```sql
-- Create activity_logs table
CREATE TABLE activity_logs (
  -- Full schema as defined
);

-- Create data_exports table
CREATE TABLE data_exports (
  -- Full schema as defined
);
```

#### 4.2 Export System Integration
- Update existing export utilities to use database
- Test export functionality with migrated data
- Verify export formats (CSV, PDF)
- Performance test large exports

## Migration Execution Plan

### Pre-Migration Checklist
- [ ] **Database Backup**: Full backup of current database
- [ ] **Code Freeze**: Stop new feature development during migration
- [ ] **User Communication**: Notify users of maintenance window
- [ ] **Test Environment**: Complete migration test on staging
- [ ] **Rollback Plan**: Verified rollback procedures
- [ ] **Monitoring**: Enhanced logging and monitoring in place

### Migration Day Procedures

#### Step 1: Preparation (30 minutes)
```bash
# 1. Create database backup
pg_dump dynprot_db > migration_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Put application in maintenance mode
echo "Maintenance mode enabled"

# 3. Verify backup integrity
psql dynprot_db < migration_backup_latest.sql --dry-run
```

#### Step 2: Schema Migration (45 minutes)
```bash
# 1. Apply Phase 1 schema changes
psql dynprot_db < migration_phase1.sql

# 2. Verify schema integrity
npm run prisma:db:pull
npm run prisma:generate

# 3. Run schema validation tests
npm run test:migration:schema
```

#### Step 3: Data Migration (90 minutes)
```bash
# 1. Export localStorage data from users
node scripts/export-local-storage.js

# 2. Run data migration
node scripts/migrate-user-data.js --batch-size=100

# 3. Verify data integrity
node scripts/verify-migration.js

# 4. Generate daily summaries
node scripts/generate-daily-summaries.js
```

#### Step 4: Validation and Testing (30 minutes)
```bash
# 1. Run comprehensive tests
npm run test:migration:complete

# 2. Verify user data access
node scripts/test-user-data-access.js

# 3. Test core functionality
npm run test:e2e:critical
```

#### Step 5: Go Live (15 minutes)
```bash
# 1. Update application configuration
export DATABASE_MIGRATION_COMPLETE=true

# 2. Restart application services
pm2 restart all

# 3. Disable maintenance mode
echo "Migration complete - service restored"

# 4. Monitor application health
node scripts/health-check.js
```

## Risk Mitigation Strategies

### Data Loss Prevention
1. **Multiple Backups**: Database, localStorage exports, code snapshots
2. **Incremental Migration**: Process users in batches
3. **Validation at Each Step**: Verify data integrity continuously
4. **Rollback Testing**: Practice rollback procedures

### Performance Impact Mitigation
1. **Off-Peak Migration**: Schedule during low usage periods
2. **Connection Pooling**: Optimize database connections
3. **Batch Processing**: Process data in manageable chunks
4. **Index Strategy**: Add indexes after data migration

### User Experience Protection
1. **Maintenance Window**: Clear communication about downtime
2. **Progress Updates**: Regular status updates during migration
3. **Fallback Mode**: Temporary read-only mode if needed
4. **Support Preparation**: Extra support staff during migration

## Post-Migration Tasks

### Immediate (Day 1)
- [ ] Monitor application performance and error rates
- [ ] Verify user login and core functionality
- [ ] Check data export functionality
- [ ] Validate daily summary calculations
- [ ] Run performance benchmarks

### Short-term (Week 1)
- [ ] Analyze user adoption of new features
- [ ] Monitor database performance metrics
- [ ] Clean up temporary migration files
- [ ] Update documentation and training materials
- [ ] Gather user feedback on data accuracy

### Long-term (Month 1)
- [ ] Implement data archival strategies
- [ ] Optimize slow queries identified post-migration
- [ ] Plan for database maintenance and upgrades
- [ ] Evaluate need for additional indexes
- [ ] Consider partitioning for large tables

## Rollback Strategy

### Immediate Rollback (< 2 hours post-migration)
```bash
# 1. Put application in maintenance mode
# 2. Restore database from backup
pg_restore -d dynprot_db migration_backup_latest.sql

# 3. Revert application code
git checkout pre-migration-tag

# 4. Restart services with old configuration
export DATABASE_MIGRATION_COMPLETE=false
pm2 restart all
```

### Delayed Rollback (> 2 hours post-migration)
- **Data Analysis**: Compare pre/post migration data
- **Selective Restore**: Restore only affected user data
- **Hybrid Approach**: Maintain new schema, restore specific data
- **User Communication**: Explain rollback and data recovery process

## Testing Strategy

### Unit Tests
```javascript
describe('Migration Scripts', () => {
  test('User profile migration preserves all data', async () => {
    // Test user profile data migration
  });
  
  test('Meal entries migration handles edge cases', async () => {
    // Test meal data migration with various edge cases
  });
  
  test('Daily summary generation is accurate', async () => {
    // Test daily summary calculations
  });
});
```

### Integration Tests
```javascript
describe('Post-Migration API', () => {
  test('User can login and access data', async () => {
    // Test complete user flow post-migration
  });
  
  test('Meal entry and retrieval works correctly', async () => {
    // Test meal CRUD operations
  });
  
  test('Export functionality works with migrated data', async () => {
    // Test data export with real migrated data
  });
});
```

### Performance Tests
```javascript
describe('Migration Performance', () => {
  test('Dashboard loads within acceptable time', async () => {
    // Test dashboard performance with real data volume
  });
  
  test('Daily summary calculations are efficient', async () => {
    // Test aggregation performance
  });
  
  test('Export generation completes within time limit', async () => {
    // Test export performance with large datasets
  });
});
```

## Success Criteria

### Migration Success Metrics
1. **Data Integrity**: 100% of user data successfully migrated without loss
2. **Performance**: Application response times within 20% of pre-migration
3. **User Experience**: Less than 5% increase in support requests
4. **Functionality**: All core features working correctly post-migration
5. **Downtime**: Total downtime less than 3 hours

### User Acceptance Criteria
1. Users can log in and access their historical data
2. All meal entries are visible and accurate
3. Favorite meals are preserved and functional
4. Goal tracking continues seamlessly
5. Data export produces expected results

## Monitoring and Alerting

### Key Metrics to Monitor
- Database connection pool usage
- Query execution times
- API response times
- Error rates and types
- User session success rates
- Data export completion rates

### Alert Thresholds
- Database CPU usage > 80% for 5 minutes
- Query execution time > 2 seconds average
- API error rate > 5% for 10 minutes
- Failed user logins > 10% for 5 minutes
- Migration process errors

## Documentation Updates

### Technical Documentation
- [ ] Update Prisma schema documentation
- [ ] Update API documentation with new endpoints
- [ ] Update database administration guides
- [ ] Create migration runbook for future reference

### User Documentation
- [ ] Update user guide with new features
- [ ] Create FAQ for migration-related questions
- [ ] Update privacy policy for new data handling
- [ ] Create troubleshooting guide for common issues

## Conclusion

This migration strategy provides a comprehensive approach to transitioning from localStorage-based data storage to a robust PostgreSQL database schema. The phased approach minimizes risk while ensuring data integrity and user experience throughout the migration process.

The strategy emphasizes safety through extensive testing, backup procedures, and rollback plans, while maintaining focus on user experience and application performance. Regular monitoring and validation at each step ensure successful completion of the migration with minimal disruption to users.