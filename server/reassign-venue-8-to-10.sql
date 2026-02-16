-- ========================================
-- Reassign Group 6 from Venue 8 to Venue 10
-- Then hard delete Venue 8
-- ========================================

-- Step 1: Move the group to venue 10
UPDATE `groups` 
SET venue_id = 10 
WHERE group_id = 6 AND venue_id = 8;

-- Step 2: Verify the move
SELECT group_id, group_name, venue_id, faculty_id 
FROM `groups` 
WHERE group_id = 6;

-- Step 3: Now venue 8 has no groups, can hard delete
DELETE FROM venue WHERE venue_id = 8;

-- Step 4: Verify deletion
SELECT venue_id, venue_name, deleted_at 
FROM venue 
WHERE venue_id = 8;
