# SnapFun ERP Backend Server

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Setup MySQL Database

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p < database.sql
```

**Option B: Using MySQL Workbench/phpMyAdmin**
- Open `database.sql` file
- Execute the SQL commands to create database and table

### 3. Configure Environment Variables

Edit `.env` file with your MySQL credentials:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=snapfun_erp
```

### 4. Start Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

### Register User
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "role": "user",
    "unique_code": "ITADMINREGISTERATION789" // Required only for admin registration
  }
  ```

### Verify Email
- **POST** `/api/auth/verify-email`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "verification_code": "12345"
  }
  ```

### Login
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!",
    "role": "user"
  }
  ```

## Password Requirements
- Minimum 8 characters
- Maximum 16 characters
- Must contain letters
- Must contain numbers
- Must contain symbols

## Company Unique Code for IT Admin
`ITADMINREGISTERATION789`
