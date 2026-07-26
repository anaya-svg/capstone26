const mysql = require('mysql2');
require('dotenv').config();

// Create database connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Connect to database
db.query('SELECT 1', (err) => {
  if (err) console.error('MySQL pool init failed:', err);
  else console.log('MySQL pool ready');
});

// Export connection for use in other files
module.exports = db;
