# Quick Setup Guide - Venue Inactive vs Delete Feature

## Step 1: Run the Migration

Open your terminal in the project root and run:

```bash
cd server/migrations
node run-venue-soft-delete-migration.js
```

**Expected Output:**
```
🔄 Connecting to database...
✅ Connected to database

🔄 Running soft delete migration for venue table...
✅ Successfully added deleted_at column to venue table
✅ Created index on deleted_at column

📋 Migration Summary:
   - Added: venue.deleted_at (TIMESTAMP NULL)
   - Added: Index idx_venue_deleted_at

💡 Usage:
   - Active venue: status="Active", deleted_at=NULL (shown in frontend)
   - Inactive venue: status="Inactive", deleted_at=NULL (shown in frontend as inactive)
   - Deleted venue: deleted_at=NOW() (hidden from frontend, data preserved)

✅ Migration completed successfully!
```

## Step 2: Restart Your Server

```bash
cd ..
npm start
# or
node index.js
```

## Step 3: Test the Feature

1. Open the admin **Classes & Groups** page
2. Click the three-dot menu (⋮) on any venue
3. You should now see:
   - **Set Inactive** button (⚠️ Orange) - for Active venues
   - **Set Active** button (🟢 Green) - for Inactive venues
   - **Delete** button (🔴 Red) - to permanently hide venue

## Step 4: Verify It Works

### Test Set Inactive:
1. Click **Set Inactive** on an Active venue
2. Confirm the action
3. ✅ Venue should show with gray "Inactive" badge
4. ✅ Venue still appears in the list

### Test Delete:
1. Click **Delete** on any venue
2. Confirm the action
3. ✅ Venue should disappear from the list completely
4. ✅ Refresh page - venue should still be hidden

### Test Status Filter:
1. Use the "Status" dropdown
2. Select "Active" - only active venues show
3. Select "Inactive" - only inactive venues show
4. ✅ Deleted venues should NEVER appear in any filter

## Rollback (if needed)

If you need to undo the migration:

```sql
ALTER TABLE venue DROP COLUMN deleted_at;
DROP INDEX idx_venue_deleted_at ON venue;
```

## Files Changed

✅ **Backend:**
- `server/migrations/add_soft_delete_to_venue.sql` (new)
- `server/migrations/run-venue-soft-delete-migration.js` (new)
- `server/controllers/groups.controller.js` (updated)

✅ **Frontend:**
- `Frontend/src/pages/SuperAdmin/Classes&Groups/Classes&Groups.jsx` (updated)

✅ **Documentation:**
- `VENUE_INACTIVE_VS_DELETE.md` (new)
- `VENUE_INACTIVE_DELETE_SETUP.md` (this file)

## Support

If you encounter any issues:
1. Check the migration ran successfully
2. Verify the `deleted_at` column exists in the `venue` table
3. Clear browser cache (Ctrl+F5)
4. Check browser console for errors

## Done! 🎉

Your venue management now supports separate Inactive and Delete actions!
