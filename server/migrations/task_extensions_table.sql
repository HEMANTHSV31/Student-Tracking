-- Create task_extensions table to track due date extensions for individual students
-- This table allows automatic and manual extensions for students who need more time (e.g., redo tasks)

CREATE TABLE IF NOT EXISTS task_extensions (
  extension_id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  student_id INT NOT NULL,
  original_due_date DATETIME NOT NULL,
  extended_due_date DATETIME NOT NULL,
  extension_days INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  
  -- Ensure only one extension record per student per task
  UNIQUE KEY unique_task_student (task_id, student_id),
  
  -- Indexes for better query performance
  INDEX idx_task_id (task_id),
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
