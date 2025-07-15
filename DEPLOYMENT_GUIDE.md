# Production Deployment Guide for SEO to Metadata Module Rename

## Overview
This guide outlines the safe deployment strategy for renaming the SEO module to Metadata module in production without causing downtime or data loss.

## Important: Development vs Production Migration Strategy

### Scenario: You've run SEO + Rename migrations locally, but production has no migrations yet

If you've already run multiple migrations locally (creating SEO module, then renaming to metadata), but production doesn't have any of these migrations yet, you have two options:

#### Option A: Clean Consolidated Migration (Recommended)
Use the single `CreateMetadataModule1734270000000` migration that creates the metadata module directly, skipping the SEO step entirely. This is cleaner and avoids potential conflicts.

#### Option B: Two-Phase Migration (If you want to match development exactly)
Use the two-phase approach below if you want production to follow the same migration path as development.

## Migration Strategy Options

### Option A: Consolidated Migration (Recommended for Clean Production)
- **Migration**: `CreateMetadataModule1734270000000`
- **Purpose**: Creates metadata module directly in production
- **Advantage**: Cleaner, no intermediate SEO step
- **Best for**: Production deployments when development had multiple migrations

### Option B: Two-Phase Migration (For Exact Development Match)
- **Phase 1**: `AddMetadataColumnsPhase1_1734268000000`
- **Phase 2**: `CleanupSeoColumnsPhase2_1734268100000`
- **Purpose**: Matches development migration history exactly
- **Best for**: When you want identical migration history

## Deployment Steps

### Option A: Consolidated Migration (Recommended)

1. **Disable problematic migrations** (temporarily rename to avoid conflicts):
   ```bash
   cd src/database/migrations
   mv 1734267700000-CreateSeoModule.ts 1734267700000-CreateSeoModule.ts.disabled
   mv 1734268000000-RenameSeoToMetadata.ts 1734268000000-RenameSeoToMetadata.ts.disabled
   ```

2. **Run the consolidated migration**:
   ```bash
   npm run migration:run
   ```
   This will run `CreateMetadataModule1734270000000` which creates the metadata module directly.

3. **Deploy your application code** with the metadata module.

4. **Verify everything works correctly**.

### Option B: Two-Phase Migration

1. **Before deploying code changes**, run the first migration:
   ```bash
   npm run migration:run
   ```
   This will run the `AddMetadataColumnsPhase1` migration which:
   - Adds new `metadata_id` columns
   - Creates a `metadata` view that points to `seo_metadata` table
   - Copies existing data from `seo_id` to `metadata_id`
   - Adds foreign key constraints for new columns

2. **Deploy your application code** with the metadata module.

3. **Verify deployment** and test functionality.

4. **Run cleanup migration** (optional):
   ```bash
   npm run migration:run
   ```
   This runs `CleanupSeoColumnsPhase2` to remove old columns and rename table.

## Handling Development vs Production Migration Mismatch

### The Problem
When you run multiple migrations locally (SEO creation + rename) but production has no migrations yet, you might encounter:
- Migration conflicts
- Inconsistent database states
- Complex rollback scenarios

### The Solution
The consolidated migration approach creates the final desired state directly in production, bypassing the intermediate SEO step. This results in:
- ✅ Clean production database
- ✅ No migration conflicts
- ✅ Simplified rollback
- ✅ Identical final schema

### Migration File Management
For production deployment, you can either:
1. **Disable conflicting migrations** (rename files to `.disabled`)
2. **Use the consolidated migration** only
3. **Keep development migrations** for local/staging environments

### Example: Managing Migration Files
```bash
# Disable old migrations for production
mv CreateSeoModule.ts CreateSeoModule.ts.disabled
mv RenameSeoToMetadata.ts RenameSeoToMetadata.ts.disabled

# Keep only the consolidated migration active
# CreateMetadataModule1734270000000.ts (active)
```

## Rollback Strategy

### If issues occur before Phase 2:
1. Simply redeploy the previous code version
2. The database still contains all original `seo_id` columns
3. No data loss occurs

### If issues occur after Phase 2:
1. Run the down migration for Phase 2:
   ```bash
   npm run migration:revert
   ```
2. Redeploy the previous code version
3. The down migration will restore the old column structure

## Testing Recommendations

### Before Production Deployment:
1. **Test in staging environment**:
   - Run both migrations in staging
   - Deploy code to staging
   - Verify all functionality works
   - Test rollback procedures

2. **Load testing**:
   - Verify performance with both column sets
   - Check that views don't impact performance significantly

### After Production Deployment:
1. **Monitor application logs** for any metadata-related errors
2. **Check database performance** metrics
3. **Verify data integrity** by spot-checking metadata entries
4. **Test all metadata-related features** thoroughly

## Database Schema Changes Summary

### Phase 1 Changes:
- **Topics table**: Adds `metadata_id` column
- **Posts table**: Adds `metadata_id` column  
- **Categories table**: Adds `metadata_id` column
- **Pages table**: Adds `metadata_id` column
- **New view**: `metadata` (points to `seo_metadata` table)
- **Data migration**: Copies `seo_id` values to `metadata_id`

### Phase 2 Changes:
- **Removes**: All `seo_id` columns
- **Removes**: `metadata` view
- **Renames**: `seo_metadata` table to `metadata`
- **Updates**: Foreign key constraints to point to renamed table

## Risk Assessment

### Low Risk (Phase 1):
- ✅ Backward compatible
- ✅ No data loss possible
- ✅ Easy rollback
- ✅ No downtime

### Medium Risk (Phase 2):
- ⚠️ Structural changes to database
- ⚠️ Requires careful timing
- ⚠️ More complex rollback
- ✅ Still no data loss if done correctly

## Best Practices

1. **Always test in staging first**
2. **Run Phase 1 migration during low-traffic hours**
3. **Wait at least 24-48 hours before running Phase 2**
4. **Monitor application closely after each phase**
5. **Have rollback plan ready**
6. **Consider keeping Phase 2 optional if system works well with current setup**

## Conclusion

This two-phase approach ensures that your production deployment is safe and can be rolled back at any point. The most important aspect is that Phase 1 maintains complete backward compatibility, allowing you to deploy and verify your changes before making irreversible structural changes in Phase 2.
