-- Create events database tables

-- Main events table
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(20) UNIQUE NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location VARCHAR(255) NOT NULL,
  customer VARCHAR(255) NOT NULL,
  booth_setup VARCHAR(100) NOT NULL,
  expected_revenue DECIMAL(15, 2),
  status ENUM('upcoming', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Event assets table (for assigned assets with quantity)
CREATE TABLE IF NOT EXISTS event_assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(20) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- Event inventories table (for assigned inventories with quantity)
CREATE TABLE IF NOT EXISTS event_inventories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(20) NOT NULL,
  inventory_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- Create trigger to auto-generate event_id with prefix EVT-
DELIMITER //
CREATE TRIGGER before_event_insert
BEFORE INSERT ON events
FOR EACH ROW
BEGIN
  DECLARE next_id INT;
  SELECT COALESCE(MAX(CAST(SUBSTRING(event_id, 5) AS UNSIGNED)), 0) + 1 INTO next_id
  FROM events;
  SET NEW.event_id = CONCAT('EVT-', LPAD(next_id, 3, '0'));
END//
DELIMITER ;
