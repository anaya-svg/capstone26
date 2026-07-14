const express = require('express');
const router = express.Router();

// GET dashboard summary data
router.get('/summary', (req, res) => {
  const db = req.app.locals.db;

  // Get total assets (excluding deleted assets)
  const totalAssetsQuery = `SELECT COUNT(*) as count FROM assets WHERE status NOT IN ('Deleted', 'Deleted Draft')`;

  // Get low stock items count
  const lowStockQuery = `SELECT COUNT(*) as count FROM inventory WHERE stock_quantity <= minimum_stock`;

  // Get upcoming events count
  const upcomingEventsQuery = `SELECT COUNT(*) as count FROM events WHERE status IN ('upcoming', 'in_progress')`;

  // Get total customers
  const totalCustomersQuery = `SELECT COUNT(*) as count FROM customers`;

  // Get customer segmentation
  const customerSegmentationQuery = `
    SELECT 
      SUM(CASE WHEN is_in_studio = TRUE THEN 1 ELSE 0 END) as in_studio,
      SUM(CASE WHEN is_off_site = TRUE THEN 1 ELSE 0 END) as off_site
    FROM customers
  `;

  // Get total revenue from in-studio visits and off-site events (in_progress or completed)
  const totalRevenueQuery = `
    SELECT (
      SELECT COALESCE(SUM(spending), 0) FROM customer_visits
    ) + (
      SELECT COALESCE(SUM(expected_revenue), 0) FROM events WHERE LOWER(status) IN ('in_progress', 'completed')
    ) as total
  `;

  db.query(totalAssetsQuery, (err, assetsResult) => {
    if (err) {
      console.error('Error fetching total assets:', err);
      return res.status(500).json({ success: false, message: 'Error fetching total assets' });
    }

    db.query(lowStockQuery, (err, lowStockResult) => {
      if (err) {
        console.error('Error fetching low stock:', err);
        return res.status(500).json({ success: false, message: 'Error fetching low stock' });
      }

      db.query(upcomingEventsQuery, (err, upcomingEventsResult) => {
        if (err) {
          console.error('Error fetching upcoming events:', err);
          return res.status(500).json({ success: false, message: 'Error fetching upcoming events' });
        }

        db.query(totalCustomersQuery, (err, totalCustomersResult) => {
          if (err) {
            console.error('Error fetching total customers:', err);
            return res.status(500).json({ success: false, message: 'Error fetching total customers' });
          }

          db.query(customerSegmentationQuery, (err, customerSegmentationResult) => {
            if (err) {
              console.error('Error fetching customer segmentation:', err);
              return res.status(500).json({ success: false, message: 'Error fetching customer segmentation' });
            }

            db.query(totalRevenueQuery, (err, revenueResult) => {
              if (err) {
                console.error('Error fetching total revenue:', err);
                return res.status(500).json({ success: false, message: 'Error fetching total revenue' });
              }

              res.json({
                success: true,
                data: {
                  totalAssets: assetsResult[0].count || 0,
                  lowStockItems: lowStockResult[0].count || 0,
                  upcomingEvents: upcomingEventsResult[0].count || 0,
                  totalCustomers: totalCustomersResult[0].count || 0,
                  customerSegmentation: {
                    inStudio: customerSegmentationResult[0].in_studio || 0,
                    offSite: customerSegmentationResult[0].off_site || 0
                  },
                  totalRevenue: revenueResult[0].total || 0
                }
              });
            });
          });
        });
      });
    });
  });
});

// GET asset status distribution for pie chart
router.get('/asset-status', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT status, COUNT(*) as count
    FROM assets
    WHERE status NOT IN ('Deleted', 'Deleted Draft')
    GROUP BY status
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching asset status distribution:', err);
      return res.status(500).json({ success: false, message: 'Error fetching asset status distribution' });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// GET asset usage by category for bar chart
router.get('/asset-usage', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT 
      c.category_name,
      COUNT(a.asset_id) as count
    FROM assets a
    LEFT JOIN categories c ON a.category_id = c.category_id
    WHERE a.status NOT IN ('Deleted', 'Deleted Draft')
    GROUP BY c.category_name
    ORDER BY count DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching asset usage by category:', err);
      return res.status(500).json({ success: false, message: 'Error fetching asset usage by category' });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// GET revenue trend for last 6 months + 3 months proactive AI projections (Cash Flow Forecasting)
router.get('/revenue-trend', (req, res) => {
  const db = req.app.locals.db;

  // 1. Get historical revenue trend for last 6 months
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

  db.query(historicalQuery, (err, historicalResults) => {
    if (err) {
      console.error('Error fetching historical revenue trend:', err);
      return res.status(500).json({ success: false, message: 'Error fetching revenue trend' });
    }

    // Map historical flag
    const historyData = historicalResults.map(r => ({
      ...r,
      in_studio_revenue: Number(r.in_studio_revenue) || 0,
      off_site_revenue: Number(r.off_site_revenue) || 0,
      total_revenue: Number(r.total_revenue) || 0,
      is_projection: false
    }));

    // 2. Calculate moving average of In-Studio walk-in revenue over the last 3 months
    const last3Months = historyData.slice(-3);
    const avgInStudio = last3Months.length > 0 
      ? last3Months.reduce((sum, r) => sum + r.in_studio_revenue, 0) / last3Months.length 
      : 5000000; // baseline fallback (5 million)

    // 3. Query upcoming event bookings for the next 3 months to calculate projected off-site revenue
    const projectionQuery = `
      SELECT 
        DATE_FORMAT(start_date, '%Y-%m') as month,
        SUM(expected_revenue) as off_site_revenue
      FROM events
      WHERE status = 'upcoming'
        AND start_date > NOW()
        AND start_date <= DATE_ADD(NOW(), INTERVAL 3 MONTH)
      GROUP BY DATE_FORMAT(start_date, '%Y-%m')
      ORDER BY month ASC
    `;

    db.query(projectionQuery, (projErr, projectionResults) => {
      if (projErr) {
        console.error('Error fetching projected event revenue:', projErr);
        return res.status(500).json({ success: false, message: 'Error fetching projection trend' });
      }

      // Create a map of projected off-site revenue by month
      const projMap = {};
      projectionResults.forEach(r => {
        projMap[r.month] = Number(r.off_site_revenue) || 0;
      });

      // 4. Generate next 3 months dynamically and build the projections
      const projections = [];
      const now = new Date();
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;

        const offSiteProj = projMap[monthStr] || 0;
        const inStudioProj = Math.round(avgInStudio);
        const totalProj = inStudioProj + offSiteProj;

        projections.push({
          month: monthStr,
          in_studio_revenue: inStudioProj,
          off_site_revenue: offSiteProj,
          total_revenue: totalProj,
          is_projection: true
        });
      }

      // Combine both history and projection arrays
      const finalTrend = [...historyData, ...projections];

      res.json({
        success: true,
        data: finalTrend
      });
    });
  });
});

// GET low stock items
router.get('/low-stock', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT 
      i.item_id,
      i.item_name,
      c.category_name,
      i.stock_quantity,
      i.minimum_stock,
      u.uom_name
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.category_id
    LEFT JOIN uom u ON i.uom_id = u.uom_id
    WHERE i.stock_quantity <= i.minimum_stock
    ORDER BY (i.minimum_stock - i.stock_quantity) DESC
    LIMIT 10
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching low stock items:', err);
      return res.status(500).json({ success: false, message: 'Error fetching low stock items' });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// GET upcoming events
router.get('/upcoming-events', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT 
      event_id,
      event_name,
      start_date,
      end_date,
      location,
      status,
      expected_revenue
    FROM events
    WHERE status IN ('upcoming', 'in_progress', 'completed')
    ORDER BY created_at DESC
    LIMIT 5
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching upcoming events:', err);
      return res.status(500).json({ success: false, message: 'Error fetching upcoming events' });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// GET procurement status distribution for pie chart
router.get('/procurement-status', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT 
      status,
      COUNT(*) as count
    FROM procurement_requests
    GROUP BY status
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching procurement status distribution:', err);
      return res.status(500).json({ success: false, message: 'Error fetching procurement status distribution' });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// GET recent procurement requests
router.get('/recent-procurement', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT 
      pr_id,
      created_at as request_date,
      requested_by as requester_name,
      status,
      total_cost as total_amount
    FROM procurement_requests
    WHERE deleted_from_received = FALSE
    ORDER BY created_at DESC
    LIMIT 5
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching recent procurement requests:', err);
      return res.status(500).json({ success: false, message: 'Error fetching recent procurement requests' });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// POST clear all system data (admin only - destructive operation)
router.post('/clear-all-data', (req, res) => {
  const db = req.app.locals.db;

  // Clear in order to respect foreign key constraints
  const queries = [
    // Child tables first
    'DELETE FROM event_assets',
    'DELETE FROM procurement_request_items',
    'DELETE FROM customer_visits',
    'DELETE FROM inventory',
    'DELETE FROM assets',
    'DELETE FROM events',
    'DELETE FROM customers',
    'DELETE FROM procurement_requests',
    'DELETE FROM vendors',
    // Keep users table but clear non-admin users if needed
    // 'DELETE FROM users WHERE role != "admin"',
    // Keep reference tables
    // 'DELETE FROM categories',
    // 'DELETE FROM uom',
    // 'DELETE FROM booth_setups'
  ];

  let queryIndex = 0;

  const executeNextQuery = () => {
    if (queryIndex >= queries.length) {
      return res.json({
        success: true,
        message: 'All system data cleared successfully'
      });
    }

    db.query(queries[queryIndex], (err, result) => {
      if (err) {
        console.error(`Error executing query ${queryIndex}:`, err);
        return res.status(500).json({
          success: false,
          message: 'Error clearing data'
        });
      }

      queryIndex++;
      executeNextQuery();
    });
  };

  executeNextQuery();
});

// GET accounting report with date filter
router.get('/accounting-report', (req, res) => {
  const db = req.app.locals.db;
  const { startDate, endDate, filterType, reportFocus } = req.query;

  let dateFilter = '';
  const params = [];

  const focusMap = {
    customer_in_studio: 'In Studio Visit',
    customer_off_site: 'Off Site Event',
    procurement: 'Procurement'
  };
  const focusFilter = reportFocus && focusMap[reportFocus]
    ? `WHERE transaction_type = ?`
    : '';
  if (focusFilter) {
    params.push(focusMap[reportFocus]);
  }

  if (filterType === 'month') {
    // Filter by specific month (YYYY-MM format)
    if (startDate) {
      dateFilter = 'AND DATE(transaction_date) >= ? AND DATE(transaction_date) <= LAST_DAY(?)';
      params.push(startDate + '-01', startDate + '-01');
    }
  } else if (filterType === 'year') {
    // Filter by specific year (YYYY format)
    if (startDate) {
      dateFilter = 'AND YEAR(transaction_date) = ?';
      params.push(startDate);
    }
  } else if (startDate && endDate) {
    // Custom date range
    dateFilter = 'AND DATE(transaction_date) >= ? AND DATE(transaction_date) <= ?';
    params.push(startDate, endDate);
  }

  // Combined query for all financial transactions
  const query = `
    SELECT 
      transaction_date,
      transaction_type,
      account,
      description,
      debit,
      credit,
      reference_id,
      status,
      customer_vendor
    FROM (
      -- Procurement Expenses (Debit)
      SELECT 
        pr.created_at as transaction_date,
        'Procurement' as transaction_type,
        'Procurement Expense' as account,
        CONCAT('Purchase Request for ', pr.supplier) as description,
        pr.total_cost as debit,
        0 as credit,
        pr.pr_id as reference_id,
        pr.status,
        pr.supplier as customer_vendor
      FROM procurement_requests pr
      WHERE pr.status IN ('Approved', 'Received')
        AND pr.deleted_from_received = FALSE
        ${dateFilter}
      
      UNION ALL
      
      -- In Studio Revenue (Credit)
      SELECT 
        cv.visit_date as transaction_date,
        'In Studio Visit' as transaction_type,
        'In Studio Revenue' as account,
        CONCAT('Visit by ', c.name) as description,
        0 as debit,
        cv.spending as credit,
        cv.visit_id as reference_id,
        'Completed' as status,
        c.name as customer_vendor
      FROM customer_visits cv
      JOIN customers c ON cv.customer_id = c.customer_id
      WHERE cv.spending > 0
        ${dateFilter}
      
      UNION ALL
      
      -- Off Site Revenue (Credit)
      SELECT 
        e.start_date as transaction_date,
        'Off Site Event' as transaction_type,
        'Off Site Revenue' as account,
        CONCAT('Event: ', e.event_name) as description,
        0 as debit,
        e.expected_revenue as credit,
        e.event_id as reference_id,
        e.status,
        e.customer as customer_vendor
      FROM events e
      WHERE e.expected_revenue > 0
        AND LOWER(e.status) IN ('in_progress', 'completed')
        ${dateFilter}
    ) as all_transactions
    ${focusFilter}
    ORDER BY transaction_date ASC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching accounting report:', err);
      return res.status(500).json({ success: false, message: 'Error fetching accounting report' });
    }

    // Calculate running balance
    let runningBalance = 0;
    const transactionsWithBalance = results.map(transaction => {
      runningBalance += (transaction.credit - transaction.debit);
      return {
        ...transaction,
        balance: runningBalance
      };
    });

    res.json({
      success: true,
      data: transactionsWithBalance
    });
  });
});

// GET predictive stock alerts (Proactive AI-Assisted Inventory Forecasting)
router.get('/predictive-stock', (req, res) => {
  const db = req.app.locals.db;

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

  db.query(stockQuery, (err, items) => {
    if (err) {
      console.error('Error fetching predictive stock:', err);
      return res.status(500).json({ success: false, message: 'Error fetching predictive stock' });
    }

    if (items.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Now let's fetch specific upcoming events that use these items
    const eventsQuery = `
      SELECT 
        e.event_id,
        e.event_name,
        e.start_date,
        e.customer,
        e.backdrop_item_id,
        e.backdrop_quantity,
        e.print_item_id,
        e.print_quantity
      FROM events e
      WHERE e.status = 'upcoming'
        AND (e.backdrop_item_id IS NOT NULL OR e.print_item_id IS NOT NULL)
    `;

    db.query(eventsQuery, (eventsErr, events) => {
      if (eventsErr) {
        console.error('Error fetching upcoming events for predictive stock:', eventsErr);
        return res.status(500).json({ success: false, message: 'Error fetching upcoming events' });
      }

      // Map events to each item
      const result = items.map(item => {
        const relatedEvents = events.filter(e => 
          (e.backdrop_item_id === item.item_id && e.backdrop_quantity > 0) ||
          (e.print_item_id === item.item_id && e.print_quantity > 0)
        ).map(e => ({
          event_id: e.event_id,
          event_name: e.event_name,
          start_date: e.start_date,
          customer: e.customer,
          reserved_qty: e.backdrop_item_id === item.item_id ? e.backdrop_quantity : e.print_quantity
        }));

        // Determine critical status
        let severity = 'low_stock';
        if (item.projected_net_stock < 0) {
          severity = 'critical_shortage';
        } else if (item.projected_net_stock <= item.minimum_stock) {
          severity = 'low_stock';
        }

        return {
          ...item,
          severity,
          upcoming_events: relatedEvents
        };
      });

      // Filter out items that have no upcoming events and are actually healthy (above min stock)
      const filteredResult = result.filter(item => 
        item.projected_net_stock <= item.minimum_stock || 
        item.projected_net_stock < 0 || 
        item.upcoming_events.length > 0
      );

      res.json({
        success: true,
        data: filteredResult
      });
    });
  });
});

module.exports = router;
