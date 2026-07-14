const mysql = require('mysql2');
require('dotenv').config({ path: './server/.env' });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database successfully');

  // Test 1: Predictive Stock query
  const stockQuery = `
    SELECT 
      i.item_id,
      i.item_name,
      c.category_name,
      u.uom_name,
      i.minimum_stock,
      i.vendor,
      i.stock_quantity AS projected_net_stock,
      COALESCE(upcoming_usage.total_reserved, 0) AS reserved_qty,
      (i.stock_quantity + COALESCE(upcoming_usage.total_reserved, 0)) AS physical_stock
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.category_id
    LEFT JOIN uom u ON i.uom_id = u.uom_id
    LEFT JOIN (
      SELECT item_id, SUM(qty) AS total_reserved
      FROM (
        SELECT backdrop_item_id AS item_id, SUM(backdrop_quantity) AS qty
        FROM events
        WHERE status = 'upcoming' AND backdrop_item_id IS NOT NULL AND backdrop_quantity > 0
        GROUP BY backdrop_item_id
        
        UNION ALL
        
        SELECT print_item_id AS item_id, SUM(print_quantity) AS qty
        FROM events
        WHERE status = 'upcoming' AND print_item_id IS NOT NULL AND print_quantity > 0
        GROUP BY print_item_id
      ) AS combined
      GROUP BY item_id
    ) AS upcoming_usage ON i.item_id = upcoming_usage.item_id
    WHERE i.status = 'active'
      AND (i.stock_quantity <= i.minimum_stock OR i.stock_quantity < 0 OR COALESCE(upcoming_usage.total_reserved, 0) > 0)
    ORDER BY i.stock_quantity ASC
  `;

  db.query(stockQuery, (err, results) => {
    if (err) {
      console.error('Test 1 failed with error:', err);
    } else {
      console.log('Test 1 Succeeded! Found items:', results.length);
    }

    // Test 2: Revenue trend query
    const historicalQuery = `
      SELECT 
        month,
        SUM(in_studio_revenue) as in_studio_revenue,
        SUM(off_site_revenue) as off_site_revenue,
        SUM(in_studio_revenue + off_site_revenue) as total_revenue
      FROM (
        SELECT 
          DATE_FORMAT(visit_date, '%Y-%m') as month,
          SUM(spending) as in_studio_revenue,
          0 as off_site_revenue
        FROM customer_visits
        WHERE visit_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND visit_date <= NOW()
        GROUP BY DATE_FORMAT(visit_date, '%Y-%m')
        
        UNION ALL
        
        SELECT 
          DATE_FORMAT(start_date, '%Y-%m') as month,
          0 as in_studio_revenue,
          SUM(expected_revenue) as off_site_revenue
        FROM events
        WHERE LOWER(status) IN ('in_progress', 'completed')
          AND start_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND start_date <= NOW()
        GROUP BY DATE_FORMAT(start_date, '%Y-%m')
      ) as combined_revenue
      GROUP BY month
      ORDER BY month ASC
    `;

    db.query(historicalQuery, (err2, results2) => {
      if (err2) {
        console.error('Test 2 failed with error:', err2);
      } else {
        console.log('Test 2 Succeeded! Found months:', results2.length);
      }
      db.end();
    });
  });
});
