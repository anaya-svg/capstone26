const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { search, segment, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT
      c.*,
      COALESCE(SUM(cv.spending), 0) as in_studio_spending,
      COUNT(DISTINCT cv.visit_id) as in_studio_visits,
      MAX(cv.visit_date) as in_studio_last_visit,
      COUNT(DISTINCT CASE WHEN LOWER(e.status) IN ('in_progress', 'completed') THEN e.event_id END) as total_off_site,
      MAX(CASE WHEN LOWER(e.status) IN ('in_progress', 'completed') THEN e.start_date END) as last_booking,
      COALESCE(SUM(CASE WHEN LOWER(e.status) IN ('in_progress', 'completed') THEN e.expected_revenue ELSE 0 END), 0) as off_site_spending
    FROM customers c
    LEFT JOIN customer_visits cv ON c.customer_id = cv.customer_id
    LEFT JOIN events e ON c.customer_id = e.customer_id
    WHERE 1=1
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM customers c
    WHERE 1=1
  `;
  const params = [];
  const countParams = [];

  if (segment === 'in_studio') {
    query += ' AND c.is_in_studio = TRUE';
    countQuery += ' AND c.is_in_studio = TRUE';
  } else if (segment === 'off_site') {
    query += ' AND c.is_off_site = TRUE';
    countQuery += ' AND c.is_off_site = TRUE';
  }

  if (search) {
    query += ' AND c.name LIKE ?';
    countQuery += ' AND c.name LIKE ?';
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  query += ' GROUP BY c.customer_id ORDER BY c.created_at DESC';
  query += ` LIMIT ${limitNum} OFFSET ${offset}`;

  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error('Error counting customers:', err);
      return res.status(500).json({
        success: false,
        message: 'Error counting customers'
      });
    }

    const total = countResult[0].total;

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching customers:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching customers'
        });
      }

      res.json({
        success: true,
        data: results,
        total: total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    });
  });
});

router.get('/export', (req, res) => {
  const db = req.app.locals.db;
  const { search, segment } = req.query;

  let query = `
    SELECT
      c.*,
      COALESCE(SUM(cv.spending), 0) as in_studio_spending,
      COUNT(DISTINCT cv.visit_id) as in_studio_visits,
      MAX(cv.visit_date) as in_studio_last_visit,
      COUNT(DISTINCT CASE WHEN LOWER(e.status) IN ('in_progress', 'completed') THEN e.event_id END) as total_off_site,
      MAX(CASE WHEN LOWER(e.status) IN ('in_progress', 'completed') THEN e.start_date END) as last_booking,
      COALESCE(SUM(CASE WHEN LOWER(e.status) IN ('in_progress', 'completed') THEN e.expected_revenue ELSE 0 END), 0) as off_site_spending
    FROM customers c
    LEFT JOIN customer_visits cv ON c.customer_id = cv.customer_id
    LEFT JOIN events e ON c.customer_id = e.customer_id
    WHERE 1=1
  `;
  const params = [];

  if (segment === 'in_studio') {
    query += ' AND c.is_in_studio = TRUE';
  } else if (segment === 'off_site') {
    query += ' AND c.is_off_site = TRUE';
  }

  if (search) {
    query += ' AND c.name LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' GROUP BY c.customer_id ORDER BY c.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error exporting customers:', err);
      return res.status(500).json({
        success: false,
        message: 'Error exporting customers'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

router.get('/summary', (req, res) => {
  const db = req.app.locals.db;
  const { segment } = req.query;

  let query = '';
  
  if (segment === 'in_studio') {
    query = `
      SELECT
        (SELECT COUNT(*) FROM customers WHERE is_in_studio = TRUE) as total_customers,
        (SELECT COALESCE(SUM(spending), 0) FROM customer_visits) as total_revenue,
        (SELECT COUNT(*) FROM customer_visits) as total_visits
    `;
  } else if (segment === 'off_site') {
    query = `
      SELECT
        (SELECT COUNT(*) FROM customers WHERE is_off_site = TRUE) as total_customers,
        (SELECT COALESCE(SUM(expected_revenue), 0) FROM events WHERE LOWER(status) IN ('in_progress', 'completed')) as total_revenue,
        (SELECT COUNT(*) FROM events WHERE LOWER(status) IN ('in_progress', 'completed')) as total_booths
    `;
  } else {
    query = `
      SELECT
        (SELECT COUNT(*) FROM customers) as total_customers,
        (
          SELECT COALESCE(SUM(spending), 0) FROM customer_visits
        ) + (
          SELECT COALESCE(SUM(expected_revenue), 0) FROM events WHERE LOWER(status) IN ('in_progress', 'completed')
        ) as total_revenue,
        (SELECT COUNT(*) FROM customer_visits) as total_visits
    `;
  }

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching customers summary:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching customers summary'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

router.get('/:customer_id', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id } = req.params;

  const query = 'SELECT * FROM customers WHERE customer_id = ?';

  db.query(query, [customer_id], (err, results) => {
    if (err) {
      console.error('Error fetching customer:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching customer'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

router.get('/:customer_id/visits', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id } = req.params;

  console.log('Fetching visits for customer:', customer_id);

  const query = 'SELECT cv.*, p.promo_code, p.promo_name FROM customer_visits cv LEFT JOIN promotions p ON cv.promo_id = p.promo_id WHERE cv.customer_id = ? ORDER BY cv.visit_date DESC';

  db.query(query, [customer_id], (err, results) => {
    if (err) {
      console.error('Error fetching customer visits:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching customer visits: ' + err.message
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

router.post('/:customer_id/assign-in-studio', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id } = req.params;

  const query = `
    UPDATE customers
    SET is_in_studio = TRUE,
        in_studio_date_added = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = ?
  `;

  db.query(query, [customer_id], (err, result) => {
    if (err) {
      console.error('Error assigning customer to In Studio:', err);
      return res.status(500).json({
        success: false,
        message: 'Error assigning customer to In Studio'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const selectQuery = 'SELECT * FROM customers WHERE customer_id = ?';
    db.query(selectQuery, [customer_id], (err, results) => {
      if (err) {
        console.error('Error fetching updated customer:', err);
        return res.status(500).json({
          success: false,
          message: 'Error assigning customer to In Studio'
        });
      }

      res.json({
        success: true,
        message: 'Customer assigned to In Studio successfully',
        data: results[0]
      });
    });
  });
});

router.post('/:customer_id/assign-off-site', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id } = req.params;

  const query = `
    UPDATE customers
    SET is_off_site = TRUE,
        off_site_date_added = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = ?
  `;

  db.query(query, [customer_id], (err, result) => {
    if (err) {
      console.error('Error assigning customer to Off Site:', err);
      return res.status(500).json({
        success: false,
        message: 'Error assigning customer to Off Site'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const selectQuery = 'SELECT * FROM customers WHERE customer_id = ?';
    db.query(selectQuery, [customer_id], (err, results) => {
      if (err) {
        console.error('Error fetching updated customer:', err);
        return res.status(500).json({
          success: false,
          message: 'Error assigning customer to Off Site'
        });
      }

      res.json({
        success: true,
        message: 'Customer assigned to Off Site successfully',
        data: results[0]
      });
    });
  });
});

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, phone_number, email } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Customer name is required'
    });
  }

  const query = `
    INSERT INTO customers (name, phone_number, email, total_visits, last_visit_date, total_spending)
    VALUES (?, ?, ?, 0, NULL, 0.00)
  `;

  db.query(query, [name, phone_number, email], (err, result) => {
    if (err) {
      console.error('Error creating customer:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'This customer is already existed'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Error creating customer'
      });
    }

    const selectQuery = 'SELECT * FROM customers WHERE customer_id = ?';
    db.query(selectQuery, [result.insertId], (err, results) => {
      if (err) {
        console.error('Error fetching created customer:', err);
        return res.status(500).json({
          success: false,
          message: 'Error creating customer'
        });
      }

      res.json({
        success: true,
        message: 'Customer created successfully',
        data: results[0]
      });
    });
  });
});

router.post('/:customer_id/visits', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id } = req.params;
  const { 
    visit_date, 
    package_name, 
    person_quantity, 
    duration, 
    paper_type_item_id, 
    paper_quantity, 
    with_photographer,
    promo_id
  } = req.body;

  console.log('Creating visit for customer:', customer_id, 'with data:', req.body);

  if (!visit_date || !package_name) {
    return res.status(400).json({
      success: false,
      message: 'Visit date and package name are required'
    });
  }

  let spending = 0;
  if (package_name === 'Snap Photobox') {
    spending = 20000;
    if (person_quantity > 1) spending += (person_quantity - 1) * 20000;
    if (duration > 7) spending += ((duration - 7) / 7) * 10000;
    if (paper_quantity > 1) spending += (paper_quantity - 1) * 5000;
  } else if (package_name === 'Snap Self Photo') {
    spending = 60000;
    if (person_quantity > 2) spending += (person_quantity - 2) * 20000;
    if (duration > 15) spending += ((duration - 15) / 15) * 12000;
    if (paper_quantity > 2) spending += (paper_quantity - 2) * 5000;
  } else if (package_name === 'Snap Pas Photo') {
    spending = 35000;
    if (duration > 7) spending += ((duration - 7) / 7) * 12000;
    if (paper_quantity > 1) spending += (paper_quantity - 1) * 5000;
  } else {
    spending = 25000;
  }

  if (with_photographer) {
    spending += 50000;
  }

  let promoDiscount = 0;

  // Simplified version without transactions for presentation demo
  if (promo_id) {
    db.query('SELECT * FROM promotions WHERE promo_id = ? AND status = "active"', [promo_id], (err, promoResults) => {
      if (err) {
        console.error('Error fetching promo:', err);
        return res.status(500).json({ success: false, message: 'Error fetching promo: ' + err.message });
      }

      if (promoResults.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive promo' });
      }

      const promo = promoResults[0];
      if (promo.discount_type === 'percentage') {
        promoDiscount = spending * (promo.discount_value / 100);
      } else {
        promoDiscount = promo.discount_value;
      }

      if (promoDiscount > spending) promoDiscount = spending;
      spending -= promoDiscount;

      processVisit();
    });
  } else {
    processVisit();
  }

  function processVisit() {
    // Update inventory first if needed
    if (paper_type_item_id && paper_quantity > 0) {
      db.query('UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE item_id = ?', [paper_quantity, paper_type_item_id], (err) => {
        if (err) {
          console.error('Error updating inventory:', err);
          return res.status(500).json({ success: false, message: 'Error updating inventory: ' + err.message });
        }
        insertVisit();
      });
    } else {
      insertVisit();
    }
  }

  function insertVisit() {
    const insertQuery = `
      INSERT INTO customer_visits (customer_id, visit_date, spending, package_name, person_quantity, duration, paper_type_item_id, paper_quantity, with_photographer, promo_id, discount_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(insertQuery, [customer_id, visit_date, spending, package_name, person_quantity, duration, paper_type_item_id, paper_quantity, with_photographer, promo_id || null, promoDiscount], (err, result) => {
      if (err) {
        console.error('Error creating visit:', err);
        return res.status(500).json({ success: false, message: 'Error creating visit: ' + err.message });
      }

      // Update customer totals
      db.query('UPDATE customers SET total_visits = total_visits + 1, total_spending = total_spending + ?, last_visit_date = ? WHERE customer_id = ?', [spending, visit_date, customer_id], (err) => {
        if (err) {
          console.error('Error updating customer totals:', err);
          return res.status(500).json({ success: false, message: 'Error updating customer totals: ' + err.message });
        }

        res.json({ success: true, message: 'Visit added successfully', data: { spending } });
      });
    });
  }
});

router.put('/:customer_id/visits/:visit_id', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id, visit_id } = req.params;
  const { 
    visit_date, 
    package_name, 
    person_quantity, 
    duration, 
    paper_type_item_id, 
    paper_quantity, 
    with_photographer,
    promo_id,
    discount_amount
  } = req.body;

  db.query('SELECT * FROM customer_visits WHERE visit_id = ?', [visit_id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Visit not found' });
    
    const oldVisit = results[0];

    let subtotal = 0;
    if (package_name === 'Snap Photobox') {
      subtotal = 20000;
      if (person_quantity > 1) subtotal += (person_quantity - 1) * 20000;
      if (duration > 7) subtotal += ((duration - 7) / 7) * 10000;
      if (paper_quantity > 1) subtotal += (paper_quantity - 1) * 5000;
    } else if (package_name === 'Snap Self Photo') {
      subtotal = 60000;
      if (person_quantity > 2) subtotal += (person_quantity - 2) * 20000;
      if (duration > 15) subtotal += ((duration - 15) / 15) * 12000;
      if (paper_quantity > 2) subtotal += (paper_quantity - 2) * 5000;
    } else if (package_name === 'Snap Pas Photo') {
      subtotal = 35000;
      if (duration > 7) subtotal += ((duration - 7) / 7) * 12000;
      if (paper_quantity > 1) subtotal += (paper_quantity - 1) * 5000;
    }

    if (with_photographer) {
      subtotal += 50000;
    }

    const promoDiscount = Number(discount_amount) || 0;
    const spending = Math.max(0, subtotal - promoDiscount);

    db.beginTransaction(err => {
      if (err) return res.status(500).json({ success: false, message: 'Transaction error' });

      if (oldVisit.paper_type_item_id && oldVisit.paper_quantity > 0) {
        db.query('UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE item_id = ?', [oldVisit.paper_quantity, oldVisit.paper_type_item_id]);
      }

      if (paper_type_item_id && paper_quantity > 0) {
        db.query('SELECT stock_quantity FROM inventory WHERE item_id = ?', [paper_type_item_id], (err, inv) => {
          if (err || inv.length === 0 || inv[0].stock_quantity < paper_quantity) {
            return db.rollback(() => res.status(400).json({ success: false, message: 'Quantity insufficient' }));
          }
          db.query('UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE item_id = ?', [paper_quantity, paper_type_item_id]);
          updateVisit();
        });
      } else {
        updateVisit();
      }

      function updateVisit() {
        const updateQuery = `
          UPDATE customer_visits 
          SET visit_date = ?, spending = ?, package_name = ?, person_quantity = ?, duration = ?, 
              paper_type_item_id = ?, paper_quantity = ?, with_photographer = ?, promo_id = ?, discount_amount = ?
          WHERE visit_id = ?
        `;
        db.query(updateQuery, [visit_date, spending, package_name, person_quantity, duration, paper_type_item_id, paper_quantity, with_photographer, promo_id || null, promoDiscount, visit_id], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Update error' }));

          const diff = spending - oldVisit.spending;
          db.query('UPDATE customers SET total_spending = total_spending + ?, last_visit_date = ? WHERE customer_id = ?', [diff, visit_date, customer_id], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Customer update error' }));

            db.commit(err => {
              if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Commit error' }));
              res.json({ success: true, message: 'Visit updated successfully' });
            });
          });
        });
      }
    });
  });
});

router.delete('/:customer_id/visits/:visit_id', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id, visit_id } = req.params;

  const getVisitQuery = 'SELECT * FROM customer_visits WHERE visit_id = ? AND customer_id = ?';
  db.query(getVisitQuery, [visit_id, customer_id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Visit not found' });

    const visit = results[0];

    db.beginTransaction(err => {
      if (err) return res.status(500).json({ success: false, message: 'Transaction error' });

      if (visit.paper_type_item_id && visit.paper_quantity > 0) {
        db.query('UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE item_id = ?', [visit.paper_quantity, visit.paper_type_item_id]);
      }

      db.query('DELETE FROM customer_visits WHERE visit_id = ?', [visit_id], (err) => {
        if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Delete error' }));

        db.query('UPDATE customers SET total_visits = total_visits - 1, total_spending = total_spending - ? WHERE customer_id = ?', [visit.spending, customer_id], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Customer update error' }));

          db.commit(err => {
            if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Commit error' }));
            res.json({ success: true, message: 'Visit deleted successfully' });
          });
        });
      });
    });
  });
});

router.get('/:customer_id/events', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id } = req.params;

  const query = `
    SELECT 
      event_id,
      event_name,
      start_date,
      end_date,
      expected_revenue,
      status,
      created_at
    FROM events
    WHERE customer_id = ? AND LOWER(status) IN ('in_progress', 'completed')
    ORDER BY start_date DESC
  `;

  db.query(query, [customer_id], (err, results) => {
    if (err) {
      console.error('Error fetching customer events:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching customer events'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

router.put('/:customer_id', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id } = req.params;
  const { name, phone_number, email } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Customer name is required'
    });
  }

  const query = `
    UPDATE customers
    SET name = ?, phone_number = ?, email = ?, updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = ?
  `;

  db.query(query, [name, phone_number, email, customer_id], (err, result) => {
    if (err) {
      console.error('Error updating customer:', err);
      return res.status(500).json({
        success: false,
        message: 'Error updating customer'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const selectQuery = 'SELECT * FROM customers WHERE customer_id = ?';
    db.query(selectQuery, [customer_id], (err, results) => {
      if (err) {
        console.error('Error fetching updated customer:', err);
        return res.status(500).json({
          success: false,
          message: 'Error updating customer'
        });
      }

      res.json({
        success: true,
        message: 'Customer updated successfully',
        data: results[0]
      });
    });
  });
});

router.delete('/:customer_id', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id } = req.params;

  const query = 'DELETE FROM customers WHERE customer_id = ?';

  db.query(query, [customer_id], (err, result) => {
    if (err) {
      console.error('Error deleting customer:', err);
      return res.status(500).json({
        success: false,
        message: 'Error deleting customer'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  });
});

module.exports = router;
