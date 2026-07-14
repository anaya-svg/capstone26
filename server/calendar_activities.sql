-- Calendar activities table (for internal staff activities/reminders)
CREATE TABLE IF NOT EXISTS calendar_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  notes TEXT,
  activity_date DATE NOT NULL,
  repeat_type ENUM('none', 'daily', 'weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'none',
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create trigger to auto-generate activity_id with prefix ACT-
DELIMITER //
CREATE TRIGGER before_activity_insert
BEFORE INSERT ON calendar_activities
FOR EACH ROW
BEGIN
  DECLARE next_id INT;
  SELECT COALESCE(MAX(CAST(SUBSTRING(activity_id, 5) AS UNSIGNED)), 0) + 1 INTO next_id
  FROM calendar_activities;
  SET NEW.activity_id = CONCAT('ACT-', LPAD(next_id, 3, '0'));
END//
DELIMITER ;
