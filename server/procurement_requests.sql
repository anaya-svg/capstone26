-- Procurement Requests Table (Header only - items are in procurement_request_items)
CREATE TABLE IF NOT EXISTS procurement_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pr_id VARCHAR(20) UNIQUE NOT NULL, -- Format: PR00001
  base_id INT NOT NULL, -- Numeric ID for prefix changes (e.g., 00001)
  requested_by VARCHAR(255) NOT NULL,
  supplier VARCHAR(255) NOT NULL,
  marketplace_link VARCHAR(500) DEFAULT NULL,
  attachment VARCHAR(500) DEFAULT NULL,
  status ENUM('Draft', 'Waiting Approval', 'Approved', 'Rejected', 'Received') NOT NULL DEFAULT 'Draft',
  rejected_from_waiting BOOLEAN DEFAULT FALSE,
  deleted_from_received BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT DEFAULT NULL,
  total_cost DECIMAL(15, 2) DEFAULT 0, -- Sum of all items' total_cost
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Index for status filtering
CREATE INDEX idx_status ON procurement_requests(status);
-- Index for requested_by
CREATE INDEX idx_requested_by ON procurement_requests(requested_by);

-- ALTER TABLE commands for existing tables
-- ALTER TABLE procurement_requests ADD COLUMN base_id INT NOT NULL DEFAULT 1;
-- ALTER TABLE procurement_requests ADD COLUMN rejected_from_waiting BOOLEAN DEFAULT FALSE;
-- ALTER TABLE procurement_requests ADD COLUMN rejection_reason TEXT DEFAULT NULL;
-- ALTER TABLE procurement_requests ADD COLUMN total_cost DECIMAL(15, 2) DEFAULT 0;

-- Migration to remove item-specific fields from procurement_requests (for existing tables)
-- ALTER TABLE procurement_requests DROP COLUMN item_classification;
-- ALTER TABLE procurement_requests DROP COLUMN item_name;
-- ALTER TABLE procurement_requests DROP COLUMN quantity;
-- ALTER TABLE procurement_requests DROP COLUMN cost;
-- ALTER TABLE procurement_requests DROP COLUMN additional_charge;
-- ALTER TABLE procurement_requests DROP COLUMN additional_cost;

