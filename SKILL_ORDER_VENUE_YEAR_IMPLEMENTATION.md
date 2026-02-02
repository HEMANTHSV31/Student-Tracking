# Skill Order Venue & Year Targeting - Implementation Complete

## What Was Implemented

### 1. Database Schema
- ✅ Created `skill_order_venues` junction table
- ✅ Created `skill_order_years` junction table  
- ✅ Added `apply_to_all_venues` and `apply_to_all_years` flags to `skill_order` table
- ✅ Proper foreign keys and cascade delete constraints

### 2. Backend (API)
- ✅ Updated `createSkillOrder` to accept venue and year selections
- ✅ Updated `getSkillOrders` to include venue/year associations
- ✅ Added `updateSkillOrderAssociations` endpoint for managing associations
- ✅ Added backward compatibility for existing code (graceful degradation)
- ✅ Route: `PUT /skill-order/:id/associations`

### 3. Frontend (UI)
- ✅ Added venue and year selection to "Add Skill" modal
- ✅ Added "Manage" button to each skill in the list
- ✅ Created "Manage Associations" modal to edit venue/year targeting
- ✅ Display venue and year info in skill list (e.g., "📍 3 venue(s) • 📅 Year 1, 2")
- ✅ Checkbox selections for:
  - Apply to All Venues / Select Specific Venues
  - Apply to All Years / Select Specific Years (1, 2, 3, 4)

## How to Use

### Step 1: Run the Migration

```bash
cd server/migrations
node run-skill-order-migration.js
```

Or manually run the SQL:
```bash
# Using mysql command line
mysql -u root -p your_database_name < add_skill_order_venue_year_associations.sql
```

### Step 2: Create a Skill with Venue/Year Targeting

1. Go to **Super Admin → Task & Assignments → Skill Order**
2. Click **"Add Skill"**
3. Fill in skill details
4. **Uncheck "All Venues"** to select specific venues
5. **Uncheck "All Years"** to select specific years (1, 2, 3, 4)
6. Click **"Add Skill"**

### Step 3: Manage Existing Skill Associations

1. Find the skill in the list
2. Click the **"Manage"** button
3. Change venue and year selections
4. Click **"Update Associations"**

## Features

### Venue Targeting
- **All Venues**: Skill applies globally to all venues
- **Specific Venues**: Select one or more venues from the list
- Can change venues later via "Manage" button

### Year Targeting  
- **All Years**: Skill applies to all student years (1, 2, 3, 4)
- **Specific Years**: Select specific years (e.g., only Year 1 and 2)
- Multi-select checkboxes for Year 1, 2, 3, 4

### Visual Indicators
Each skill displays:
- 📍 **Venue Info**: "All Venues" or "3 venue(s)"
- 📅 **Year Info**: "All Years" or "Year 1, 2"

## API Changes

### Create Skill (POST /skill-order)
**Before:**
```json
{
  "course_type": "frontend",
  "skill_name": "JavaScript",
  "is_prerequisite": true
}
```

**After:**
```json
{
  "course_type": "frontend",
  "skill_name": "JavaScript",
  "is_prerequisite": true,
  "apply_to_all_venues": false,
  "venue_ids": [1, 2, 3],
  "apply_to_all_years": false,
  "years": [1, 2]
}
```

### Get Skills (GET /skill-order?course_type=frontend)
**Response includes:**
```json
{
  "id": 1,
  "skill_name": "JavaScript",
  "apply_to_all_venues": false,
  "venues": [
    { "venue_id": 1, "venue_name": "Chennai" },
    { "venue_id": 2, "venue_name": "Bangalore" }
  ],
  "apply_to_all_years": false,
  "years": [1, 2]
}
```

### Update Associations (PUT /skill-order/:id/associations)
```json
{
  "venue_ids": [1, 3, 5],
  "years": [1, 2, 3],
  "apply_to_all_venues": false,
  "apply_to_all_years": false
}
```

## Backward Compatibility

The code handles cases where:
- Migration hasn't been run yet (tables don't exist)
- Old data exists without venue/year associations
- Default: `apply_to_all_venues = true`, `apply_to_all_years = true`

## Testing Checklist

- [ ] Run migration successfully
- [ ] Create skill with "All Venues" and "All Years"
- [ ] Create skill with specific venues (e.g., 2 out of 5)
- [ ] Create skill with specific years (e.g., Year 1 and 2 only)
- [ ] Verify skill list shows correct venue/year info
- [ ] Click "Manage" button and change associations
- [ ] Verify changes are saved and displayed correctly
- [ ] Create skill without selecting any venue (should show warning)
- [ ] Verify backward compatibility with existing skills

## Error Handling

If you see **500 error** on `/skill-order` endpoint:
- Migration hasn't been run yet
- Run: `node server/migrations/run-skill-order-migration.js`
- Or manually execute the SQL file

The backend now gracefully handles missing tables by:
- Setting default values for missing columns
- Skipping venue/year queries if tables don't exist
- Allowing skill creation without new features until migration runs
