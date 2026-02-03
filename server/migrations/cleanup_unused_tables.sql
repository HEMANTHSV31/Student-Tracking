-- =====================================================
-- CLEANUP UNUSED TABLES WITH EMPTY DATA
-- =====================================================
-- This script removes the skills table which is replaced by 
-- course_name in student_skills table.
-- 
-- Tables to remove:
-- 1. skills - Empty table that was replaced by course_name in student_skills
--
-- Tables to KEEP (despite being empty - they are actively used):
-- - skill_order_venues: Used for venue-specific skill assignment
-- - skill_order_years: Used for year-specific skill assignment
--
-- Date: 2026-02-03
-- =====================================================

-- Step 1: Drop foreign key constraint from student_skills
-- This allows us to drop the skills table
ALTER TABLE student_skills 
DROP FOREIGN KEY IF EXISTS student_skills_ibfk_2;

-- Step 2: Drop the skill_id column from student_skills
-- This column was always NULL and never used (course_name is used instead)
ALTER TABLE student_skills 
DROP COLUMN IF EXISTS skill_id;

-- Step 3: Drop the empty skills table
-- This table was never populated; course_name in student_skills is used instead
DROP TABLE IF EXISTS skills;

-- =====================================================
-- NOTE: skill_order_venues and skill_order_years tables are KEPT
-- They are empty now but actively used by skillOrder.controller.js
-- for managing which venues/years can see which skills.
-- =====================================================

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================
-- Check remaining tables:
-- SHOW TABLES;

-- Verify student_skills structure:
-- DESCRIBE student_skills;

-- Verify no data loss (student_skills should still have all records):
-- SELECT COUNT(*) FROM student_skills;

-- =====================================================
-- ROLLBACK (If needed - Run BEFORE migration)
-- =====================================================
-- Note: These tables are empty, so there's no data to backup
-- Backup commands (optional):
-- CREATE TABLE skills_backup LIKE skills;
-- CREATE TABLE skill_order_venues_backup LIKE skill_order_venues;
-- CREATE TABLE skill_order_years_backup LIKE skill_order_years;
