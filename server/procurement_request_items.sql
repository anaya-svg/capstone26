-- Procurement Request Items Table (for multiple items per request)
CREATE TABLE IF NOT EXISTS procurement_request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pr_id VARCHAR(20) NOT NULL, -- Foreign key to procurement_requests
  item_classification ENUM('Supplies', 'Equipment') NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  cost DECIMAL(15, 2) NOT NULL,
  additional_charge VARCHAR(255) DEFAULT NULL,
  additional_cost DECIMAL(15, 2) DEFAULT NULL,
  total_cost DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pr_id) REFERENCES procurement_requests(pr_id) ON DELETE CASCADE
);

-- Index for pr_id
CREATE INDEX idx_pr_id ON procurement_request_items(pr_id);
