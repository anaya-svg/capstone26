const db = require('./config/database');

const resetDatabase = async () => {
  console.log('Starting database reset...');
  
  try {
    // Explicitly select the database
    await db.promise().query('USE snapfun_erp');
    console.log('Database selected: snapfun_erp');

    // Disable foreign key checks
    await db.promise().query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('Foreign key checks disabled');

    // Clear tables in order of dependencies
    const tables = [
      'procurement_request_items',
      'procurement_requests',
      'customer_visits',
      'event_assets',
      'events',
      'customers',
      'assets',
      'inventory',
      'categories',
      'calendar_activities',
      'promotions'
    ];

    for (const table of tables) {
      await db.promise().query(`DELETE FROM ${table}`);
      console.log(`Cleared table: ${table}`);
    }

    // Re-enable foreign key checks
    await db.promise().query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Foreign key checks re-enabled');

    // Reset auto-increment counters
    for (const table of tables) {
      await db.promise().query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }
    console.log('Auto-increment counters reset');

    // Insert default categories
    await db.promise().query(`
      INSERT INTO categories (category_name) VALUES 
      ('supplies'), ('asset'), ('consumables'), ('equipment')
    `);
    console.log('Default categories inserted');

    // Insert default UOM (ignore if already exists)
    await db.promise().query(`
      INSERT IGNORE INTO uom (uom_name) VALUES 
      ('pcs'), ('roll'), ('kg'), ('liter'), ('meter'), ('box'), ('pack'), ('set'), ('unit')
    `);
    console.log('Default UOM inserted (or already exists)');

    console.log('Database reset completed successfully!');
    console.log('Users, vendors, and UOM preserved.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();
