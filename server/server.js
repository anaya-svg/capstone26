// Touch file for nodemon restart
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const db = require('./config/database');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://erp.snapfunstudio.id'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/pr_attachment', express.static(path.join(__dirname, 'pr_attachment')));
app.use('/asset_attachment', express.static(path.join(__dirname, 'asset_attachment')));
app.use('/inventory_attachments', express.static(path.join(__dirname, 'inventory_attachments')));

app.locals.db = db;

if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
  console.error('EMAIL_USER and EMAIL_APP_PASSWORD must be set in environment variables');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

app.locals.transporter = transporter;

const createUsersTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') DEFAULT 'user',
      is_verified BOOLEAN DEFAULT FALSE,
      verification_code VARCHAR(5),
      status ENUM('active', 'inactive') DEFAULT 'active',
      last_login TIMESTAMP NULL,
      session_token VARCHAR(255) NULL,
      session_expires_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table ready');
      const checkStatusColumn = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'snapfun_erp' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'status'
      `;
      db.query(checkStatusColumn, (err, results) => {
        if (err) {
          console.error('Error checking status column:', err);
          return;
        }
        if (results.length === 0) {
          const addStatusColumn = `ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'`;
          db.query(addStatusColumn, (err) => {
            if (err) console.error('Error adding status column:', err);
            else console.log('Status column added to users table');
          });
        }
      });
      const checkLastLoginColumn = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'snapfun_erp'
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'last_login'
      `;
      db.query(checkLastLoginColumn, (err, results) => {
        if (err) {
          console.error('Error checking last_login column:', err);
          return;
        }
        if (results.length === 0) {
          const addLastLoginColumn = `ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL`;
          db.query(addLastLoginColumn, (err) => {
            if (err) console.error('Error adding last_login column:', err);
            else console.log('Last login column added to users table');
          });
        }
      });
      const checkSessionTokenColumn = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'snapfun_erp'
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'session_token'
      `;
      db.query(checkSessionTokenColumn, (err, results) => {
        if (err) {
          console.error('Error checking session_token column:', err);
          return;
        }
        if (results.length === 0) {
          const addSessionTokenColumn = `ALTER TABLE users ADD COLUMN session_token VARCHAR(255) NULL`;
          db.query(addSessionTokenColumn, (err) => {
            if (err) console.error('Error adding session_token column:', err);
            else console.log('Session token column added to users table');
          });
        }
      });
      const checkSessionExpiresColumn = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'snapfun_erp'
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'session_expires_at'
      `;
      db.query(checkSessionExpiresColumn, (err, results) => {
        if (err) {
          console.error('Error checking session_expires_at column:', err);
          return;
        }
        if (results.length === 0) {
          const addSessionExpiresColumn = `ALTER TABLE users ADD COLUMN session_expires_at TIMESTAMP NULL`;
          db.query(addSessionExpiresColumn, (err) => {
            if (err) console.error('Error adding session_expires_at column:', err);
            else console.log('Session expires column added to users table');
          });
        }
      });
    }
  });
};

const createProcurementRequestsTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS procurement_requests (
      pr_id VARCHAR(20) PRIMARY KEY,
      base_id INT NOT NULL,
      requested_by VARCHAR(255) NOT NULL,
      supplier VARCHAR(255) NOT NULL,
      marketplace_link TEXT,
      attachment VARCHAR(500),
      status ENUM('Draft', 'Waiting Approval', 'Approved', 'Rejected', 'Received') DEFAULT 'Draft',
      total_cost DECIMAL(15, 2) DEFAULT 0.00,
      rejection_reason TEXT,
      rejected_from_waiting BOOLEAN DEFAULT FALSE,
      deleted_from_received BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  
  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating procurement_requests table:', err);
    } else {
      console.log('Procurement requests table ready');
    }
  });
};

const createProcurementRequestItemsTable = () => {
  const checkItemColumnQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'snapfun_erp' 
    AND TABLE_NAME = 'procurement_request_items' 
    AND COLUMN_NAME = 'item_id'
  `;

  db.query(checkItemColumnQuery, (err, results) => {
    if (err) {
      console.error('Error checking item_id column:', err);
      return;
    }

    if (results.length === 0) {
      const addColumnQuery = `
        ALTER TABLE procurement_request_items 
        ADD COLUMN item_id INT,
        ADD FOREIGN KEY (item_id) REFERENCES inventory(item_id) ON DELETE SET NULL
      `;
      db.query(addColumnQuery, (err) => {
        if (err) {
          console.error('Error adding item_id column:', err);
        } else {
          console.log('Item ID column added to procurement_request_items table');
        }
      });
    } else {
      console.log('Item ID column already exists in procurement_request_items table');
    }
  });

  const checkColumnQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'snapfun_erp' 
    AND TABLE_NAME = 'procurement_request_items' 
    AND COLUMN_NAME = 'asset_id'
  `;

  db.query(checkColumnQuery, (err, results) => {
    if (err) {
      console.error('Error checking asset_id column:', err);
      return;
    }

    if (results.length === 0) {
      const addColumnQuery = `
        ALTER TABLE procurement_request_items 
        ADD COLUMN asset_id VARCHAR(20),
        ADD FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE SET NULL
      `;
      db.query(addColumnQuery, (err) => {
        if (err) {
          console.error('Error adding asset_id column:', err);
        } else {
          console.log('Asset ID column added to procurement_request_items table');
        }
      });
    } else {
      console.log('Asset ID column already exists in procurement_request_items table');
    }
  });
};

const createBoothSetupsTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS booth_setups (
      booth_setup_id INT AUTO_INCREMENT PRIMARY KEY,
      booth_setup_name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating booth_setups table:', err);
    } else {
      console.log('Booth Setups table ready');
      const checkQuery = 'SELECT COUNT(*) as count FROM booth_setups';
      db.query(checkQuery, (err, result) => {
        if (err) {
          console.error('Error checking booth_setups count:', err);
        } else if (result[0].count === 0) {
          const insertQuery = `
            INSERT INTO booth_setups (booth_setup_name) VALUES
            ('Photobooth Standard'),
            ('Photobooth Premium'),
            ('360 Booth'),
            ('Mirror Booth'),
            ('GIF Booth'),
            ('Video Booth'),
            ('Green Screen Booth'),
            ('Open Air Booth')
          `;
          db.query(insertQuery, (err) => {
            if (err) {
              console.error('Error inserting default booth setups:', err);
            } else {
              console.log('Default booth setups inserted');
            }
          });
        }
      });
    }
  });
};

const createEventsTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id VARCHAR(20) UNIQUE,
      event_name VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      location VARCHAR(255),
      customer VARCHAR(255),
      customer_id INT,
      booth_setup TEXT,
      expected_revenue DECIMAL(15, 2),
      status ENUM('upcoming', 'in_progress', 'completed', 'cancelled') DEFAULT 'upcoming',
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_reason TEXT,
      deleted_by VARCHAR(255),
      deleted_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL
    )
  `;
  
  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating events table:', err);
    } else {
      console.log('Events table ready');
      
      const alterEnumQuery = `
        ALTER TABLE events 
        MODIFY COLUMN status ENUM('upcoming', 'in_progress', 'completed', 'cancelled') DEFAULT 'upcoming'
      `;
      db.query(alterEnumQuery, (err) => {
        if (err) {
          console.error('Error updating events status ENUM:', err);
        } else {
          console.log('Events status ENUM updated');
        }
      });
      
      const addColumnQuery = `
        ALTER TABLE events 
        ADD COLUMN customer_id INT,
        ADD FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL
      `;
      db.query(addColumnQuery, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_MULTIPLE_PRIMARY_KEY') {
          console.error('Error adding customer_id column:', err);
        }
      });

      const addCreatedByQuery = `
        ALTER TABLE events
        ADD COLUMN created_by VARCHAR(255) NULL
      `;
      db.query(addCreatedByQuery, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
          console.error('Error adding created_by column to events table:', err);
        } else {
          console.log('Created_by column ready in events table');
        }
      });

      const addDeletedColumnsQuery = `
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
        ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
      `;
      db.query(addDeletedColumnsQuery, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
          console.error('Error adding delete columns to events table:', err);
        } else {
          console.log('Delete columns ready in events table');
        }
      });
    }
  });
};

const createEventAssetsTable = () => {
  const checkTableQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'event_assets' 
    AND TABLE_SCHEMA = DATABASE()
  `;
  
  db.query(checkTableQuery, (err, results) => {
    if (err) {
      console.error('Error checking event_assets table:', err);
      return;
    }

    if (results.length === 0) {
      const createTableQuery = `
        CREATE TABLE event_assets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id VARCHAR(20) NOT NULL,
          asset_id VARCHAR(20) NOT NULL,
          quantity INT NOT NULL,
          original_location VARCHAR(50),
          FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
          FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
        )
      `;

      db.query(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating event_assets table:', err);
        } else {
          console.log('Event assets table ready');
        }
      });
      return;
    }

    const existingColumns = results.map(col => col.COLUMN_NAME);
    const requiredColumns = [
      { name: 'original_location', type: 'VARCHAR(50)' }
    ];

    requiredColumns.forEach(column => {
      if (!existingColumns.includes(column.name)) {
        db.query(`ALTER TABLE event_assets ADD COLUMN ${column.name} ${column.type}`, (alterErr) => {
          if (alterErr) {
            console.error(`Error adding ${column.name} column to event_assets:`, alterErr);
          } else {
            console.log(`${column.name} column ready in event_assets table`);
          }
        });
      }
    });
    console.log('Event assets table already exists with updated structure');
  });
};

const createEventIdTrigger = () => {
  const checkTriggerQuery = `
    SELECT COUNT(*) as count FROM information_schema.triggers
    WHERE trigger_name = 'generate_event_id'
    AND trigger_schema = DATABASE()
  `;

  db.query(checkTriggerQuery, (err, results) => {
    if (err) {
      console.error('Error checking event_id trigger:', err);
      return;
    }
    if (results[0].count > 0) {
      console.log('Event ID trigger already exists');
      return;
    }

    const createTriggerQuery = `
    CREATE TRIGGER generate_event_id
    BEFORE INSERT ON events
    FOR EACH ROW
    BEGIN
      IF NEW.event_id IS NULL THEN
        SET NEW.event_id = CONCAT('EVT-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(event_id, 5) AS UNSIGNED)), 0) + 1 FROM events), 3, '0'));
      END IF;
    END
  `;

    db.query(createTriggerQuery, (err) => {
      if (err) console.error('Error creating event_id trigger:', err);
      else console.log('Event ID trigger ready');
    });
  });
};

const createCalendarActivitiesTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS calendar_activities (
      activity_id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      notes TEXT,
      activity_date DATE NOT NULL,
      repeat_type ENUM('none', 'daily', 'weekly', 'monthly', 'yearly') DEFAULT 'none',
      created_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating calendar_activities table:', err);
    } else {
      console.log('Calendar activities table ready');
    }
  });
};

const createAssetsTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS assets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id VARCHAR(20) UNIQUE,
      name VARCHAR(255) NOT NULL,
      category ENUM('Camera Gear', 'Lighting', 'Booth Equipment', 'Computers', 'Furniture', 'Other') NOT NULL,
      status ENUM('Available', 'In Use', 'Maintenance', 'Drafted', 'Deleted', 'Deleted Draft') DEFAULT 'Available',
      location ENUM('In Studio', 'Off Site') NOT NULL,
      \`condition\` ENUM('Good', 'Fair', 'Poor') NOT NULL,
      quantity INT DEFAULT 1,
      photo_attachment VARCHAR(255),
      has_barcode BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_reason TEXT,
      INDEX idx_asset_id (asset_id),
      INDEX idx_status (status),
      INDEX idx_category (category)
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating assets table:', err);
    } else {
      console.log('Assets table ready');
      const alterQuery = `
        ALTER TABLE assets
        ADD COLUMN quantity INT DEFAULT 1 AFTER \`condition\`
      `;
      db.query(alterQuery, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
          console.error('Error adding quantity column:', err);
        } else if (err && err.code === 'ER_DUP_FIELDNAME') {
          console.log('Quantity column already exists in assets table');
        } else {
          console.log('Quantity column added to assets table');
        }
      });
    }
  });
};

const createCustomersTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS customers (
      customer_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      phone_number VARCHAR(20),
      email VARCHAR(255),
      total_visits INT DEFAULT 0,
      last_visit_date DATE,
      total_spending DECIMAL(15, 2) DEFAULT 0.00,
      is_in_studio BOOLEAN DEFAULT FALSE,
      is_off_site BOOLEAN DEFAULT FALSE,
      in_studio_date_added TIMESTAMP NULL,
      off_site_date_added TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating customers table:', err);
    } else {
      console.log('Customers table ready');
      const checkColumns = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'customers' 
        AND TABLE_SCHEMA = DATABASE()
      `;
      
      db.query(checkColumns, (err, results) => {
        if (err) {
          console.error('Error checking customers columns:', err);
          return;
        }
        
        const existingColumns = results.map(row => row.COLUMN_NAME);
        
        const checkUniqueConstraint = `
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
          WHERE TABLE_NAME = 'customers'
          AND CONSTRAINT_TYPE = 'UNIQUE'
          AND CONSTRAINT_SCHEMA = DATABASE()
        `;
        
        db.query(checkUniqueConstraint, (err, constraintResults) => {
          if (err) {
            console.error('Error checking unique constraint:', err);
            return;
          }
          
          const existingConstraints = constraintResults.map(row => row.CONSTRAINT_NAME);
          
          if (!existingConstraints.includes('name')) {
            const addUniqueConstraint = `ALTER TABLE customers ADD UNIQUE INDEX name (name)`;
            db.query(addUniqueConstraint, (err) => {
              if (err && err.code !== 'ER_DUP_KEYNAME') {
                console.error('Error adding unique constraint to name:', err);
              } else {
                console.log('Unique constraint added to name column');
              }
            });
          }
        });
        
        if (!existingColumns.includes('is_in_studio')) {
          db.query(`ALTER TABLE customers ADD COLUMN is_in_studio BOOLEAN DEFAULT FALSE`, (err) => {
            if (err) console.error('Error adding is_in_studio column:', err);
            else console.log('is_in_studio column added');
          });
        }
        
        if (!existingColumns.includes('is_off_site')) {
          db.query(`ALTER TABLE customers ADD COLUMN is_off_site BOOLEAN DEFAULT FALSE`, (err) => {
            if (err) console.error('Error adding is_off_site column:', err);
            else console.log('is_off_site column added');
          });
        }
        
        if (!existingColumns.includes('in_studio_date_added')) {
          db.query(`ALTER TABLE customers ADD COLUMN in_studio_date_added TIMESTAMP NULL`, (err) => {
            if (err) console.error('Error adding in_studio_date_added column:', err);
            else console.log('in_studio_date_added column added');
          });
        }
        
        if (!existingColumns.includes('off_site_date_added')) {
          db.query(`ALTER TABLE customers ADD COLUMN off_site_date_added TIMESTAMP NULL`, (err) => {
            if (err) console.error('Error adding off_site_date_added column:', err);
            else console.log('off_site_date_added column added');
          });
        }
      });
    }
  });
};

const createCustomerVisitsTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS customer_visits (
      visit_id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      visit_date DATE NOT NULL,
      spending DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating customer_visits table:', err);
    } else {
      console.log('Customer visits table ready');
    }
  });
};

const createInventoryTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id VARCHAR(20) UNIQUE,
      item_name VARCHAR(255) NOT NULL,
      category_id INT,
      stock_quantity INT NOT NULL DEFAULT 0,
      minimum_stock INT NOT NULL DEFAULT 0,
      uom_id INT,
      vendor VARCHAR(255),
      stock_status ENUM('in_stock', 'low_stock', 'out_of_stock') DEFAULT 'in_stock',
      status ENUM('active', 'drafted') DEFAULT 'active',
      attachment VARCHAR(255),
      last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
      FOREIGN KEY (uom_id) REFERENCES uom(uom_id) ON DELETE SET NULL
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating inventory table:', err);
    } else {
      console.log('Inventory table ready');
      
      db.query(`SHOW COLUMNS FROM inventory`, (err, columns) => {
        if (err) {
          console.error('Error checking inventory columns:', err);
          return;
        }
        
        const existingColumns = columns.map(col => col.Field);
        console.log('Existing columns:', existingColumns);
        
        // Check if we need to migrate from old structure (item_id as INT primary key) to new structure
        const hasOldStructure = existingColumns.includes('item_id') && !existingColumns.includes('id');
        
        if (hasOldStructure) {
          console.log('Migrating inventory table from old structure to new structure...');
          
          // Use temporary column approach to avoid auto-increment conflict
          const migrationSteps = [
            // Step 1: Disable foreign key checks
            `SET FOREIGN_KEY_CHECKS = 0`,
            
            // Step 2: Add temporary column to store old item_id values
            `ALTER TABLE inventory ADD COLUMN temp_item_id INT`,
            
            // Step 3: Copy item_id values to temp column
            `UPDATE inventory SET temp_item_id = item_id`,
            
            // Step 4: Drop primary key from item_id
            `ALTER TABLE inventory DROP PRIMARY KEY`,
            
            // Step 5: Remove auto_increment from item_id
            `ALTER TABLE inventory MODIFY COLUMN item_id INT`,
            
            // Step 6: Add new id column as auto-increment primary key
            `ALTER TABLE inventory ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST`,
            
            // Step 7: Convert item_id from INT to VARCHAR
            `ALTER TABLE inventory MODIFY COLUMN item_id VARCHAR(20) UNIQUE`,
            
            // Step 8: Generate INV-XXX IDs using the temp values
            `UPDATE inventory SET item_id = CONCAT('INV-', LPAD(temp_item_id, 3, '0'))`,
            
            // Step 9: Drop temporary column
            `ALTER TABLE inventory DROP COLUMN temp_item_id`,
            
            // Step 10: Re-enable foreign key checks
            `SET FOREIGN_KEY_CHECKS = 1`
          ];
          
          let stepIndex = 0;
          const executeNextStep = () => {
            if (stepIndex >= migrationSteps.length) {
              console.log('Inventory table migration completed successfully');
              // Verify and fix any items that still don't have INV-XXX format
              db.query(`UPDATE inventory SET item_id = CONCAT('INV-', LPAD(id, 3, '0')) WHERE item_id NOT LIKE 'INV-%'`, (err) => {
                if (err) console.error('Error fixing item_id format:', err);
                else console.log('Fixed item_id format for remaining items');
              });
              return;
            }
            
            db.query(migrationSteps[stepIndex], (err) => {
              if (err) {
                console.error(`Migration step ${stepIndex + 1} failed:`, err);
                // Re-enable FK checks even if migration fails
                if (stepIndex !== 9) {
                  db.query(`SET FOREIGN_KEY_CHECKS = 1`, () => {});
                }
              } else {
                console.log(`Migration step ${stepIndex + 1} completed`);
                stepIndex++;
                executeNextStep();
              }
            });
          };
          
          executeNextStep();
        } else {
          // Table already has new structure, but check if any items need INV-XXX format
          db.query(`UPDATE inventory SET item_id = CONCAT('INV-', LPAD(id, 3, '0')) WHERE item_id NOT LIKE 'INV-%'`, (err) => {
            if (err) console.error('Error fixing item_id format:', err);
            else console.log('Fixed item_id format for items without INV-XXX format');
          });
        }
        
        const requiredColumns = ['id', 'item_id', 'item_name', 'category_id', 'stock_quantity', 'minimum_stock', 'uom_id', 'vendor', 'stock_status', 'status', 'attachment', 'last_update', 'created_at'];
        
        requiredColumns.forEach(col => {
          if (!existingColumns.includes(col)) {
            console.log(`Adding column: ${col}`);
            let alterQuery = '';
            
            if (col === 'id') {
              // Skip if we already handled migration above
              return;
            } else if (col === 'item_id') {
              // Skip if we already handled migration above
              return;
            } else if (col === 'category_id') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN category_id INT, ADD FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL`;
            } else if (col === 'uom_id') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN uom_id INT, ADD FOREIGN KEY (uom_id) REFERENCES uom(uom_id) ON DELETE SET NULL`;
            } else if (col === 'stock_status') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN stock_status ENUM('in_stock', 'low_stock', 'out_of_stock') DEFAULT 'in_stock'`;
            } else if (col === 'status') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN status ENUM('active', 'drafted') DEFAULT 'active'`;
            } else if (col === 'stock_quantity') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN stock_quantity INT NOT NULL DEFAULT 0`;
            } else if (col === 'minimum_stock') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN minimum_stock INT NOT NULL DEFAULT 0`;
            } else if (col === 'attachment') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN attachment VARCHAR(255)`;
            } else if (col === 'last_update') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;
            } else if (col === 'created_at') {
              alterQuery = `ALTER TABLE inventory ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
            } else {
              alterQuery = `ALTER TABLE inventory ADD COLUMN ${col} VARCHAR(255)`;
            }
            
            db.query(alterQuery, (alterErr) => {
              if (alterErr) {
                console.error(`Error adding column ${col}:`, alterErr);
              } else {
                console.log(`Column ${col} added successfully`);
              }
            });
          }
        });
      });
    }
  });
};

const createInventoryIdTrigger = () => {
  const checkTriggerQuery = `
    SELECT COUNT(*) as count FROM information_schema.triggers
    WHERE trigger_name = 'before_inventory_insert'
    AND trigger_schema = DATABASE()
  `;

  db.query(checkTriggerQuery, (err, results) => {
    if (err) {
      console.error('Error checking inventory ID trigger:', err);
      return;
    }

    if (results[0].count > 0) {
      console.log('Inventory ID trigger already exists');
      return;
    }

    const createTriggerQuery = `
      CREATE TRIGGER before_inventory_insert
      BEFORE INSERT ON inventory
      FOR EACH ROW
      BEGIN
        IF NEW.item_id IS NULL THEN
          SET NEW.item_id = CONCAT('INV-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(item_id, 5) AS UNSIGNED)), 0) + 1 FROM inventory), 3, '0'));
        END IF;
      END
    `;

    db.query(createTriggerQuery, (err) => {
      if (err) console.error('Error creating inventory ID trigger:', err);
      else console.log('Inventory ID trigger ready');
    });
  });
};

const createCategoriesTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS categories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating categories table:', err);
    } else {
      console.log('Categories table ready');
      const checkCategories = `SELECT COUNT(*) as count FROM categories`;
      db.query(checkCategories, (err, results) => {
        if (err) {
          console.error('Error checking categories:', err);
          return;
        }
        if (results[0].count === 0) {
          const insertDefaults = `
            INSERT INTO categories (category_name) VALUES 
            ('supplies'), ('asset'), ('consumables'), ('equipment')
          `;
          db.query(insertDefaults, (err) => {
            if (err) console.error('Error inserting default categories:', err);
            else console.log('Default categories inserted');
          });
        }
      });
    }
  });
};

const createUOMTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS uom (
      uom_id INT AUTO_INCREMENT PRIMARY KEY,
      uom_name VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating UOM table:', err);
    } else {
      console.log('UOM table ready');
      const checkUOM = `SELECT COUNT(*) as count FROM uom`;
      db.query(checkUOM, (err, results) => {
        if (err) {
          console.error('Error checking UOM:', err);
          return;
        }
        if (results[0].count === 0) {
          const insertDefaults = `
            INSERT INTO uom (uom_name) VALUES 
            ('pcs'), ('roll'), ('kg'), ('liter'), ('meter'), ('box'), ('pack'), ('set'), ('unit')
          `;
          db.query(insertDefaults, (err) => {
            if (err) console.error('Error inserting default UOMs:', err);
            else console.log('Default UOMs inserted');
          });
        }
      });
    }
  });
};

const createAssetIdTrigger = () => {
  const checkTriggerQuery = `
    SELECT COUNT(*) as count FROM information_schema.triggers
    WHERE trigger_name = 'before_asset_insert'
    AND trigger_schema = DATABASE()
  `;

  db.query(checkTriggerQuery, (err, results) => {
    if (err) {
      console.error('Error checking asset ID trigger:', err);
      return;
    }

    if (results[0].count === 0) {
      const createTriggerQuery = `
        CREATE TRIGGER before_asset_insert
        BEFORE INSERT ON assets
        FOR EACH ROW
        BEGIN
          DECLARE next_id INT;
          SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM assets;
          SET NEW.asset_id = CONCAT('AST-', LPAD(next_id, 3, '0'));
        END
      `;

      db.query(createTriggerQuery, (err, result) => {
        if (err) {
          console.error('Error creating asset ID trigger:', err);
        } else {
          console.log('Asset ID trigger ready');
        }
      });
    } else {
      console.log('Asset ID trigger already exists');
    }
  });
};

const createPromotionsTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS promotions (
      promo_id INT AUTO_INCREMENT PRIMARY KEY,
      promo_code VARCHAR(50) UNIQUE NOT NULL,
      promo_name VARCHAR(255) NOT NULL,
      discount_type ENUM('percentage', 'flat') NOT NULL,
      discount_value DECIMAL(15, 2) NOT NULL,
      applicable_to ENUM('in_studio', 'off_site', 'all') DEFAULT 'all',
      min_transaction DECIMAL(15, 2) DEFAULT 0,
      eligibility_type ENUM('min_spending', 'package_bundling', 'weekday_slump', 'no_rule') DEFAULT 'no_rule',
      target_package_name VARCHAR(100) DEFAULT NULL,
      day_restrictions VARCHAR(50) DEFAULT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating promotions table:', err);
    } else {
      console.log('Promotions table ready');
      
      const checkVisitColumns = "SHOW COLUMNS FROM customer_visits LIKE 'promo_id'";
      db.query(checkVisitColumns, (err, results) => {
        if (!err && results.length === 0) {
          db.query("ALTER TABLE customer_visits ADD COLUMN promo_id INT DEFAULT NULL, ADD COLUMN discount_amount DECIMAL(15, 2) DEFAULT 0.00", (err) => {
            if (err) console.error('Error altering customer_visits for promotions:', err);
            else console.log('Promotions columns added to customer_visits');
          });
        }
      });

      const checkEventColumns = "SHOW COLUMNS FROM events LIKE 'promo_id'";
      db.query(checkEventColumns, (err, results) => {
        if (!err && results.length === 0) {
          db.query("ALTER TABLE events ADD COLUMN promo_id INT DEFAULT NULL, ADD COLUMN discount_amount DECIMAL(15, 2) DEFAULT 0.00", (err) => {
            if (err) console.error('Error altering events for promotions:', err);
            else console.log('Promotions columns added to events');
          });
        }
      });
    }
  });
};

createUsersTable();
createPromotionsTable();
createProcurementRequestsTable();
createProcurementRequestItemsTable();
createBoothSetupsTable();
createEventsTable();
createEventAssetsTable();
createEventIdTrigger();
createCalendarActivitiesTable();
createAssetsTable();
createAssetIdTrigger();
createCustomersTable();
createCustomerVisitsTable();
createCategoriesTable();
createUOMTable();
createInventoryTable();
createInventoryIdTrigger();

app.get('/', (req, res) => {
  res.json({ message: 'SnapFun ERP API is running' });
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const { requireAuth, requireAdmin } = require('./middleware/auth');

const eventsRoutes = require('./routes/events');
app.use('/api/events', requireAuth, eventsRoutes);

const calendarRoutes = require('./routes/calendar');
app.use('/api/calendar', requireAuth, calendarRoutes);

const procurementRoutes = require('./routes/procurement');
app.use('/api/procurement', requireAuth, procurementRoutes);

const assetsRoutes = require('./routes/assets');
app.use('/api/assets', requireAuth, assetsRoutes);

const customersRoutes = require('./routes/customers');
app.use('/api/customers', requireAuth, customersRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/users', requireAuth, requireAdmin, usersRoutes);

const inventoryRoutes = require('./routes/inventory');
app.use('/api/inventory', requireAuth, inventoryRoutes);

const categoriesRoutes = require('./routes/categories');
app.use('/api/categories', requireAuth, categoriesRoutes);

const uomRoutes = require('./routes/uom');
app.use('/api/uom', requireAuth, uomRoutes);

const boothSetupsRoutes = require('./routes/boothSetups');
app.use('/api/booth-setups', requireAuth, boothSetupsRoutes);

const vendorsRoutes = require('./routes/vendors');
app.use('/api/vendors', requireAuth, vendorsRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', requireAuth, dashboardRoutes);

const chatbotRoutes = require('./routes/chatbot');
app.use('/api/chatbot', requireAuth, chatbotRoutes);

const promotionsRoutes = require('./routes/promotions');
app.use('/api/promotions', requireAuth, promotionsRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Keep server running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep server running
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
