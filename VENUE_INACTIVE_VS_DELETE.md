# Venue Status Management - Inactive vs Delete

## Overview
The venue management system now has **two separate actions** for managing venue visibility and status:

1. **Set Inactive/Active** - Toggle venue operational status (venue remains visible in frontend)
2. **Delete** - Permanently hide venue from all lists (data preserved but venue hidden)

---

## Three Venue States

### 1. Active Venue
- **Status**: `Active`
- **Deleted**: `deleted_at = NULL`
- **Visibility**: ✅ Shown in frontend
- **Badge**: Green "Active" badge
- **Usage**: Fully operational venue with active classes

### 2. Inactive Venue
- **Status**: `Inactive`
- **Deleted**: `deleted_at = NULL`
- **Visibility**: ✅ Shown in frontend (with Inactive badge)
- **Badge**: Gray "Inactive" badge
- **Usage**: Temporarily closed or non-operational venue (e.g., under maintenance, between semesters)

### 3. Deleted Venue
- **Status**: `Inactive`
- **Deleted**: `deleted_at = TIMESTAMP`
- **Visibility**: ❌ Hidden from all frontend lists
- **Data**: ✅ All data preserved in database
- **Usage**: Venue no longer needed but historical data must be kept

---

## Migration Required

Before using this feature, run the migration:

```bash
cd server/migrations
node run-venue-soft-delete-migration.js
```

This adds the `deleted_at` column to the `venue` table.

---

## User Interface

### Action Menu Options

When you click the three-dot menu (⋮) on a venue card:

1. **Edit Venue** - Edit venue details
2. **Assign Faculty** - Assign/change faculty
3. **Upload Students** - Bulk upload students
4. **Add Individual Student** - Add single student
5. **View Students** - See all students in venue
6. **Set Inactive** / **Set Active** - Toggle operational status (⚠️ Orange/🟢 Green)
7. **Delete** - Permanently hide venue (🔴 Red)

### Visual Indicators

- **Active venues**: Green badge, fully functional
- **Inactive venues**: Gray badge, still visible but not operational
- **Deleted venues**: Not shown in list at all

---

## How to Use

### Scenario 1: Temporarily Close a Venue
**Use Case**: Venue under maintenance, between semesters, or temporarily not in use

**Action**: Click **Set Inactive**
- Venue remains visible in frontend with "Inactive" status
- Students marked as active (but venue is inactive)
- Easy to reactivate later with **Set Active**

### Scenario 2: Permanently Remove a Venue
**Use Case**: Venue no longer exists, project ended, venue decommissioned

**Action**: Click **Delete**
- Venue hidden from all frontend lists
- All historical data preserved:
  - Student records (marked as "Dropped")
  - Group information
  - Attendance history
  - Task submissions
  - Roadmap progress
- Cannot be recovered through UI (database access required)

### Scenario 3: Reactivate an Inactive Venue
**Action**: Click **Set Active**
- Changes status from Inactive to Active
- Venue becomes fully operational again

---

## Status Filter

The frontend has a **Status Filter** dropdown:
- **All Status** - Show both Active and Inactive venues
- **Active** - Show only Active venues
- **Inactive** - Show only Inactive venues

**Note**: Deleted venues are **never** shown in any filter option.

---

## Backend Implementation

### Database Schema
```sql
CREATE TABLE venue (
  venue_id INT PRIMARY KEY AUTO_INCREMENT,
  venue_name VARCHAR(255) NOT NULL,
  capacity INT,
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  deleted_at TIMESTAMP NULL DEFAULT NULL,  -- New column for soft delete
  ...
);
```

### Query Logic
```sql
-- Get all non-deleted venues (both Active and Inactive)
SELECT * FROM venue 
WHERE (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
ORDER BY status DESC, venue_name;

-- Delete venue (soft delete)
UPDATE venue 
SET deleted_at = NOW(), status = 'Inactive' 
WHERE venue_id = ?;

-- Toggle status
UPDATE venue 
SET status = 'Active' -- or 'Inactive'
WHERE venue_id = ?;
```

---

## API Endpoints

### Get All Venues
```
GET /groups/venues
```
Returns all Active and Inactive venues (excludes deleted venues)

### Toggle Venue Status
```
PUT /groups/venues/:venueId
Body: { status: 'Active' | 'Inactive' }
```
Changes venue operational status

### Delete Venue
```
DELETE /groups/venues/:venueId
```
Soft deletes venue (sets `deleted_at = NOW()`)

---

## What Happens When You Delete a Venue?

1. ✅ `deleted_at` timestamp is set to current time
2. ✅ `status` is set to 'Inactive'
3. ✅ All active students marked as 'Dropped'
4. ✅ Associated groups set to 'Inactive'
5. ✅ Roadmap resources cleaned up (files deleted)
6. ✅ Roadmap modules deleted
7. ✅ Venue hidden from all frontend lists
8. ✅ **All historical data preserved** in database

---

## Data Preservation

Even after deletion, the following data remains in the database:

| Data Type | Status After Deletion |
|-----------|----------------------|
| Venue record | Preserved (deleted_at set) |
| Student records | Preserved (status='Dropped') |
| Group records | Preserved (status='Inactive') |
| Attendance records | Preserved |
| Task submissions | Preserved |
| Skill completions | Preserved |
| Grade records | Preserved |

---

## Recovering Deleted Venues

Deleted venues **cannot** be recovered through the UI. Database access is required:

```sql
-- View deleted venues
SELECT * FROM venue WHERE deleted_at IS NOT NULL;

-- Restore a deleted venue
UPDATE venue 
SET deleted_at = NULL, status = 'Active' 
WHERE venue_id = ?;
```

---

## Best Practices

### When to Set Inactive
- ✅ Venue under maintenance
- ✅ Between academic terms
- ✅ Temporarily not accepting students
- ✅ Planning to reuse venue later
- ✅ Want to keep venue visible for reference

### When to Delete
- ✅ Venue permanently closed
- ✅ Project/course ended
- ✅ Venue name was created by mistake
- ✅ Venue decommissioned
- ✅ Want to clean up venue list

---

## Differences Summary

| Feature | Set Inactive | Delete |
|---------|-------------|--------|
| Visible in frontend | ✅ Yes | ❌ No |
| Status badge shown | ✅ Gray "Inactive" | ❌ Not shown |
| Can filter/search | ✅ Yes | ❌ No |
| Students status | Active (venue inactive) | Dropped |
| Easy to reverse | ✅ Click "Set Active" | ❌ Requires DB access |
| Data preserved | ✅ Yes | ✅ Yes |
| Use case | Temporary | Permanent |

---

## Migration Status Check

To verify the migration was successful:

```sql
-- Check if deleted_at column exists
SHOW COLUMNS FROM venue LIKE 'deleted_at';

-- Check index
SHOW INDEX FROM venue WHERE Key_name = 'idx_venue_deleted_at';
```

---

## Troubleshooting

### Problem: "Set Inactive" button not showing
**Solution**: Refresh the page (Ctrl+F5) to clear frontend cache

### Problem: Deleted venues still showing
**Solution**: 
1. Check if migration was run successfully
2. Verify `deleted_at IS NULL` condition in query
3. Clear browser cache

### Problem: Cannot reactivate inactive venue
**Solution**: Use the "Set Active" button in the action menu (green toggle icon)

### Problem: Want to recover deleted venue
**Solution**: Run SQL query to set `deleted_at = NULL`

---

## Related Files

- **Migration**: `server/migrations/add_soft_delete_to_venue.sql`
- **Migration Runner**: `server/migrations/run-venue-soft-delete-migration.js`
- **Backend Controller**: `server/controllers/groups.controller.js`
- **Frontend Component**: `Frontend/src/pages/SuperAdmin/Classes&Groups/Classes&Groups.jsx`
- **API Routes**: `server/routes/groups.routes.js`

---

## Testing Checklist

- [ ] Run migration successfully
- [ ] Create a test venue
- [ ] Set venue to Inactive - verify gray badge appears
- [ ] Filter by "Inactive" status - verify venue shows
- [ ] Set venue to Active - verify green badge appears
- [ ] Delete venue - verify it disappears from list
- [ ] Check status filter - verify deleted venue not in any filter
- [ ] Verify student records preserved in database
- [ ] Create new venue - verify it doesn't conflict with deleted venue data

---

## Summary

**Inactive** = Temporarily not operational, still visible  
**Delete** = Permanently hidden, data preserved

Choose wisely based on whether you need the venue to remain visible!
