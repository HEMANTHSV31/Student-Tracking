-- Run these SQL commands in your MySQL database to add soft delete support:

-- Add soft delete columns to tasks table
ALTER TABLE tasks ADD COLUMN deleted TINYINT(1) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create index for better performance
CREATE INDEX idx_tasks_deleted ON tasks(deleted);

-- Update existing deleted tasks (if any) - this is optional
-- UPDATE tasks SET deleted = 0 WHERE deleted IS NULL;