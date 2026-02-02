# Venue Selection Implementation - Complete Guide

## Overview
Complete venue selection system implemented across Course Types, Skills, and Study Roadmaps with full management capabilities.

---

## 1. Course Type Creation with Venue Selection

### What It Does
When creating a new course type (e.g., "Frontend", "Backend"), you can now select which venues should have access to it.

### How to Use
1. **Navigate**: Super Admin → Task & Assignments → Skill Order
2. **Click**: "+ Create New Course Type" button
3. **Enter**: Course type name (e.g., "Frontend Development")
4. **Select Venues**:
   - ✅ **Apply to All Venues** - Course type available everywhere
   - ❌ Uncheck and select specific venues from the list
5. **Click**: "Create Course Type"

### What Happens
- Creates the course type with a "Getting Started" placeholder skill
- Associates it with selected venues
- Only selected venues can see and use this course type

### Visual Feedback
- Shows venue count: "✓ 3 venue(s) selected"
- Yellow badge with checkmark when venues are selected

---

## 2. Skill Order - Individual Skills with Venue & Year Selection

### What It Does
Each skill in a course type can be targeted to specific venues and year levels.

### How to Use

#### **Adding a New Skill**
1. **Navigate**: Skill Order tab → Select course type
2. **Click**: "+ Add Skill"
3. **Fill Details**:
   - Skill Name (e.g., "JavaScript Basics")
   - Description (optional)
   - Prerequisite checkbox
4. **Select Targeting**:
   - **Venues**: Apply to All / Select Specific
   - **Years**: Apply to All / Select Year 1, 2, 3, 4
5. **Click**: "Add Skill"

#### **Managing Existing Skill Assignments**
1. **Find Skill** in the list
2. **Click**: "Manage" button
3. **Modify**:
   - Change venue selections
   - Change year selections
4. **Click**: "Update Associations"

### Visual Display
Each skill shows:
- 📍 **Venue Info**: "All Venues" or "3 venue(s)"
- 📅 **Year Info**: "All Years" or "Year 1, 2"

Example:
```
JavaScript Basics
📍 3 venue(s) • 📅 Year 1, 2
```

### Use Cases
- **Year 1 Only**: Teach basic skills to first-year students only
- **Specific Venues**: Roll out new curriculum to selected locations first
- **Advanced Skills**: Target Year 3, 4 for advanced topics

---

## 3. Study Roadmap - Venue-Specific Modules

### What It Does
When creating roadmap modules, select which venues should see them. Modules can be created for:
- Single venue
- Multiple selected venues
- All venues

### How to Use

#### **Creating Roadmap for Specific Venues**
1. **Navigate**: Task & Assignments → Study Roadmap
2. **Select**: "All Venues" from venue dropdown
3. **Click**: "+ Add Day" button
4. **Venue Selection Modal Opens**:
   - Shows list of all venues with checkboxes
   - "Select All Venues" option at top
   - Shows venue count at bottom
5. **Select Venues**: Check the venues you want
6. **Click**: "Create Module for X Venue(s)"

#### **Creating for Single Venue**
1. **Select**: Specific venue from dropdown
2. **Click**: "+ Add Day"
3. **Module Created**: Automatically for that venue only

### Visual Display

#### **Multi-Venue Modules** (when viewing "All Venues")
Shows venue list under module:
```
Venues: Chennai, Bangalore, Mumbai
```

#### **Single Venue Modules**
Shows venue badge next to title:
```
DAY 1  JavaScript Fundamentals  📍 Chennai
```

### Features
- **Batch Creation**: Create same module for multiple venues at once
- **Skip Duplicates**: Automatically skips if module already exists in a venue
- **Venue Summary**: Shows "Created for 5 venue(s), skipped 2 (already exists)"

---

## 4. Management & Updates

### Roadmap Venue Management
**Coming Soon**: Update existing roadmap modules to add/remove venues

### Skill Venue Management
✅ **Available Now**: 
- Click "Manage" button on any skill
- Change venue and year assignments
- Updates apply immediately

### Course Type Venue Management
**Current**: Set during creation
**Future**: Update venue assignments for entire course types

---

## 5. API Endpoints

### Course Type Creation
```
POST /api/skill-order
{
  "course_type": "frontend",
  "skill_name": "Getting Started",
  "apply_to_all_venues": false,
  "venue_ids": [1, 2, 3],
  "apply_to_all_years": true
}
```

### Skill Creation
```
POST /api/skill-order
{
  "course_type": "frontend",
  "skill_name": "JavaScript",
  "apply_to_all_venues": false,
  "venue_ids": [1, 2],
  "apply_to_all_years": false,
  "years": [1, 2]
}
```

### Update Skill Associations
```
PUT /api/skill-order/:id/associations
{
  "venue_ids": [1, 3, 5],
  "years": [1, 2, 3],
  "apply_to_all_venues": false,
  "apply_to_all_years": false
}
```

### Roadmap Creation
```
POST /api/roadmap
{
  "day": 1,
  "title": "Introduction",
  "course_type": "frontend",
  "venue_ids": [1, 2, 3]  // Multiple venues
}
```

---

## 6. Database Schema

### Tables Created
1. **skill_order_venues** - Links skills to venues
2. **skill_order_years** - Links skills to year levels

### Columns Added
- `skill_order.apply_to_all_venues` (BOOLEAN)
- `skill_order.apply_to_all_years` (BOOLEAN)

### Migration Status
Run: `node server/migrations/run-skill-order-migration.js`

---

## 7. Workflow Examples

### Example 1: Create Frontend Course for Selected Venues
1. Click "Create New Course Type"
2. Enter "Frontend Development"
3. Uncheck "Apply to All Venues"
4. Select: Chennai, Bangalore, Hyderabad
5. Create → Course type now available only in those 3 venues

### Example 2: Add Year-Specific Skill
1. In Frontend course type
2. Click "Add Skill"
3. Name: "Advanced React Patterns"
4. Uncheck "All Years"
5. Select: Year 3, Year 4
6. Create → Only 3rd and 4th year students see this skill

### Example 3: Roadmap for Multiple Venues
1. Select "All Venues" dropdown
2. Click "Add Day"
3. Venue modal opens
4. Select: Chennai, Mumbai, Pune (3 venues)
5. Click "Create Module for 3 Venue(s)"
6. Same module created in all 3 venues simultaneously

### Example 4: Change Skill Venues Later
1. Find skill "JavaScript Basics"
2. Click "Manage" button
3. Uncheck Chennai, add Delhi
4. Click "Update Associations"
5. Chennai students no longer see it, Delhi students now see it

---

## 8. Benefits

### Administrative Control
- ✅ Gradual rollout to test venues
- ✅ Venue-specific curriculum customization
- ✅ Year-level appropriate content

### Efficiency
- ✅ Batch operations for multi-venue updates
- ✅ Visual indicators show current assignments
- ✅ Easy modification without recreating content

### Student Experience
- ✅ Students only see relevant content for their venue
- ✅ Year-appropriate skill progression
- ✅ Cleaner, more focused interface

---

## 9. Visual Indicators Summary

| Location | Indicator | Meaning |
|----------|-----------|---------|
| Skill List | 📍 All Venues | Skill applies globally |
| Skill List | 📍 3 venue(s) | Skill in 3 specific venues |
| Skill List | 📅 All Years | All year levels |
| Skill List | 📅 Year 1, 2 | Year 1 and 2 only |
| Roadmap (All Venues) | Venues: Chennai, Bangalore | Module exists in these venues |
| Roadmap (Single Venue) | 📍 Chennai | Module for Chennai venue |
| Course Type Modal | ✓ 3 venue(s) selected | Venue selection count |

---

## 10. Testing Checklist

- [ ] Create course type for all venues
- [ ] Create course type for specific venues (2-3 selected)
- [ ] Add skill with all venues + all years
- [ ] Add skill with specific venues + specific years
- [ ] Click "Manage" on skill and change venues
- [ ] Click "Manage" on skill and change years
- [ ] Create roadmap for single venue
- [ ] Create roadmap for multiple venues (use "All Venues" → select specific)
- [ ] Verify venue badge shows on single-venue roadmaps
- [ ] Verify venue list shows on multi-venue roadmaps
- [ ] Test skipping duplicate modules

---

## 11. Troubleshooting

### "500 Error" on Skill Order
**Cause**: Migration not run
**Solution**: `node server/migrations/run-skill-order-migration.js`

### "Please select at least one venue"
**Cause**: Unchecked "All Venues" but didn't select any specific venue
**Solution**: Either check "All Venues" OR select at least one venue

### Venues not showing in modal
**Cause**: Venues prop not passed to component
**Solution**: Ensure parent component passes `venues` array

### Changes not reflecting
**Cause**: Frontend cache
**Solution**: Refresh page (Ctrl+F5) or clear browser cache

---

## 12. Future Enhancements

- [ ] Bulk update venues for existing roadmaps
- [ ] Copy roadmap from one venue to another
- [ ] Venue group templates (e.g., "Metro Cities", "Tier 2 Cities")
- [ ] Analytics: Show which venues have most content
- [ ] Export/Import course types with venue mappings
