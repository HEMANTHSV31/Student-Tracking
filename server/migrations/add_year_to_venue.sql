-- Migration: Add year column to venue table
-- This allows venues to be associated with a specific academic year (1st, 2nd, 3rd, 4th year)

-- Add year column to venue table
ALTER TABLE venue 
ADD COLUMN year INT DEFAULT NULL COMMENT 'Academic year (1, 2, 3, or 4)' AFTER location;

-- Add index for better query performance when filtering by year
CREATE INDEX idx_venue_year ON venue(year);

-- Optional: Update existing venues if needed (set to NULL by default, which means all years)
-- UPDATE venue SET year = NULL WHERE year IS NULL;
