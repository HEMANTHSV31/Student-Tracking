-- Add venue and year associations to skill_order
-- This allows skill orders to be targeted to specific venues and years

-- Create skill_order_venues junction table
CREATE TABLE IF NOT EXISTS skill_order_venues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  skill_order_id INT NOT NULL,
  venue_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_order_id) REFERENCES skill_order(id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES venue(venue_id) ON DELETE CASCADE,
  UNIQUE KEY unique_skill_venue (skill_order_id, venue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create skill_order_years junction table
CREATE TABLE IF NOT EXISTS skill_order_years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  skill_order_id INT NOT NULL,
  year INT NOT NULL CHECK (year IN (1, 2, 3, 4)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_order_id) REFERENCES skill_order(id) ON DELETE CASCADE,
  UNIQUE KEY unique_skill_year (skill_order_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add apply_to_all flag to skill_order table (backward compatibility)
ALTER TABLE skill_order 
ADD COLUMN IF NOT EXISTS apply_to_all_venues BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS apply_to_all_years BOOLEAN DEFAULT TRUE;

-- Index for performance
CREATE INDEX idx_skill_order_venues_venue ON skill_order_venues(venue_id);
CREATE INDEX idx_skill_order_years_year ON skill_order_years(year);
