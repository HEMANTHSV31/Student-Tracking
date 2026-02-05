-- Practice Courses and Questions Tables
-- Run this SQL in your MySQL database

-- Practice Courses table
CREATE TABLE IF NOT EXISTS practice_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_levels INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Practice Questions table
CREATE TABLE IF NOT EXISTS practice_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  level INT DEFAULT 1,
  code_snippet TEXT,
  expected_output TEXT,
  hints JSON,
  image_url VARCHAR(500),
  time_limit INT DEFAULT 0,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  points INT DEFAULT 10,
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES practice_courses(id) ON DELETE CASCADE,
  INDEX idx_course_level (course_id, level)
);

-- Optional: Insert sample data
-- INSERT INTO practice_courses (title, description, total_levels) VALUES 
-- ('HTML & CSS Fundamentals', 'Learn the basics of web development with HTML and CSS', 5),
-- ('JavaScript Essentials', 'Master JavaScript programming fundamentals', 5);
