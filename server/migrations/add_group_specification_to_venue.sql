-- Migration: Add group_specification column to venue table
-- This allows venues to be categorized by type (e.g., 'pbl', 'oracle', 'academics')

-- Add group_specification column to venue table
ALTER TABLE venue 
ADD COLUMN group_specification VARCHAR(100) DEFAULT NULL COMMENT 'Type of group (e.g., pbl, oracle, academics)' AFTER year;

-- Add index for better query performance when filtering by group_specification
CREATE INDEX idx_venue_group_specification ON venue(group_specification);

-- Optional: Add some default values if needed
-- UPDATE venue SET group_specification = 'academics' WHERE group_specification IS NULL;
