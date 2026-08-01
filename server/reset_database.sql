-- SnapFun ERP Database Reset Script
-- This script empties all tables except users, vendors, and UOM
-- Run this in MySQL: mysql -u root -p snapfun_erp < reset_database.sql

USE snapfun_erp;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Clear procurement request items first (dependent table)
DELETE FROM procurement_request_items;

-- Clear procurement requests
DELETE FROM procurement_requests;

-- Clear customer visits (dependent table)
DELETE FROM customer_visits;

-- Clear event assets (dependent table)
DELETE FROM event_assets;

-- Clear events
DELETE FROM events;

-- Clear customers
DELETE FROM customers;

-- Clear assets
DELETE FROM assets;

-- Clear inventory
DELETE FROM inventory;

-- Clear categories
DELETE FROM categories;

-- Clear booth setups
DELETE FROM booth_setups;

-- Clear calendar activities
DELETE FROM calendar_activities;

-- Clear promotions
DELETE FROM promotions;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Reset auto-increment counters
ALTER TABLE procurement_request_items AUTO_INCREMENT = 1;
ALTER TABLE procurement_requests AUTO_INCREMENT = 1;
ALTER TABLE customer_visits AUTO_INCREMENT = 1;
ALTER TABLE event_assets AUTO_INCREMENT = 1;
ALTER TABLE events AUTO_INCREMENT = 1;
ALTER TABLE customers AUTO_INCREMENT = 1;
ALTER TABLE assets AUTO_INCREMENT = 1;
ALTER TABLE inventory AUTO_INCREMENT = 1;
ALTER TABLE categories AUTO_INCREMENT = 1;
ALTER TABLE booth_setups AUTO_INCREMENT = 1;
ALTER TABLE calendar_activities AUTO_INCREMENT = 1;
ALTER TABLE promotions AUTO_INCREMENT = 1;

-- Insert default booth setups
INSERT INTO booth_setups (booth_setup_name) VALUES
('Photobooth Standard'),
('Photobooth Premium'),
('360 Booth'),
('Mirror Booth'),
('GIF Booth'),
('Video Booth'),
('Green Screen Booth'),
('Open Air Booth');

-- Insert default categories
INSERT INTO categories (category_name) VALUES 
('supplies'), ('asset'), ('consumables'), ('equipment');

-- Insert default UOM
INSERT INTO uom (uom_name) VALUES 
('pcs'), ('roll'), ('kg'), ('liter'), ('meter'), ('box'), ('pack'), ('set'), ('unit');

SELECT 'Database reset completed successfully. Users, vendors, and UOM preserved.' AS message;
