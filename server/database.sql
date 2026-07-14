-- Create Database
CREATE DATABASE IF NOT EXISTS snapfun_erp;

-- Use the database
USE snapfun_erp;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
