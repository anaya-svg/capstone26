const express = require('express');
const router = express.Router();

// GET all promotions
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const query = 'SELECT * FROM promotions ORDER BY created_at DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching promotions:', err);
      return res.status(500).json({ success: false, message: 'Error fetching promotions' });
    }
    res.json({ success: true, data: results });
  });
});

// POST new promotion
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    promo_code,
    promo_name,
    discount_type,
    discount_value,
    applicable_to,
    min_transaction,
    eligibility_type,
    target_package_name,
    day_restrictions,
    start_date,
    end_date,
    status
  } = req.body;

  if (!promo_code || !promo_name || !discount_type || !discount_value || !start_date || !end_date) {
    return res.status(400).json({ success: false, message: 'Missing required promotional fields' });
  }

  // Check for duplicate promo code
  const checkQuery = 'SELECT promo_id FROM promotions WHERE LOWER(promo_code) = LOWER(?)';
  db.query(checkQuery, [promo_code], (err, results) => {
    if (err) {
      console.error('Error checking duplicate promo code:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }

    const insertQuery = `
      INSERT INTO promotions (
        promo_code, promo_name, discount_type, discount_value, applicable_to,
        min_transaction, eligibility_type, target_package_name, day_restrictions,
        start_date, end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      promo_code.toUpperCase(),
      promo_name,
      discount_type,
      discount_value,
      applicable_to || 'all',
      min_transaction || 0,
      eligibility_type || 'no_rule',
      target_package_name || null,
      day_restrictions || null,
      start_date,
      end_date,
      status || 'active'
    ];

    db.query(insertQuery, params, (err, result) => {
      if (err) {
        console.error('Error creating promotion:', err);
        return res.status(500).json({ success: false, message: 'Error creating promotion' });
      }
      res.json({ success: true, message: 'Promotion created successfully', data: { promo_id: result.insertId } });
    });
  });
});

// PUT update promotion
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const promoId = req.params.id;
  const {
    promo_code,
    promo_name,
    discount_type,
    discount_value,
    applicable_to,
    min_transaction,
    eligibility_type,
    target_package_name,
    day_restrictions,
    start_date,
    end_date,
    status
  } = req.body;

  // Check duplicate promo code excluding this ID
  const checkQuery = 'SELECT promo_id FROM promotions WHERE LOWER(promo_code) = LOWER(?) AND promo_id != ?';
  db.query(checkQuery, [promo_code, promoId], (err, results) => {
    if (err) {
      console.error('Error checking duplicate code:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Promo code is already used by another promotion' });
    }

    const updateQuery = `
      UPDATE promotions SET
        promo_code = ?, promo_name = ?, discount_type = ?, discount_value = ?, applicable_to = ?,
        min_transaction = ?, eligibility_type = ?, target_package_name = ?, day_restrictions = ?,
        start_date = ?, end_date = ?, status = ?
      WHERE promo_id = ?
    `;

    const params = [
      promo_code.toUpperCase(),
      promo_name,
      discount_type,
      discount_value,
      applicable_to,
      min_transaction || 0,
      eligibility_type,
      target_package_name || null,
      day_restrictions || null,
      start_date,
      end_date,
      status,
      promoId
    ];

    db.query(updateQuery, params, (err, result) => {
      if (err) {
        console.error('Error updating promotion:', err);
        return res.status(500).json({ success: false, message: 'Error updating promotion' });
      }
      res.json({ success: true, message: 'Promotion updated successfully' });
    });
  });
});

// DELETE promotion
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const promoId = req.params.id;
  const query = 'DELETE FROM promotions WHERE promo_id = ?';

  db.query(query, [promoId], (err, result) => {
    if (err) {
      console.error('Error deleting promotion:', err);
      return res.status(500).json({ success: false, message: 'Error deleting promotion' });
    }
    res.json({ success: true, message: 'Promotion deleted successfully' });
  });
});

// POST validate promotion code
router.post('/validate', (req, res) => {
  const db = req.app.locals.db;
  const { promo_code, amount, transaction_type, date, package_name } = req.body;

  if (!promo_code) {
    return res.status(400).json({ success: false, message: 'Promo code is required' });
  }

  const query = 'SELECT * FROM promotions WHERE BINARY promo_code = ? LIMIT 1';
  db.query(query, [promo_code.toUpperCase().trim()], (err, results) => {
    if (err) {
      console.error('Error validating promo code:', err);
      return res.status(500).json({ success: false, message: 'Database query error during validation' });
    }

    if (results.length === 0) {
      return res.json({ success: false, message: 'Kode promo tidak ditemukan!' });
    }

    const promo = results[0];

    // 1. Check status
    if (promo.status !== 'active') {
      return res.json({ success: false, message: 'Promo ini sedang tidak aktif!' });
    }

    // 2. Check dates
    const transactionDate = date ? new Date(date) : new Date();
    const startDate = new Date(promo.start_date);
    const endDate = new Date(promo.end_date);
    
    // Set hours to 0 to compare days only
    transactionDate.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);

    if (transactionDate < startDate) {
      return res.json({ success: false, message: 'Masa berlaku promo ini belum dimulai!' });
    }
    if (transactionDate > endDate) {
      return res.json({ success: false, message: 'Masa berlaku promo ini telah berakhir!' });
    }

    // 3. Check applicability
    if (promo.applicable_to !== 'all' && promo.applicable_to !== transaction_type) {
      const typeLabel = promo.applicable_to === 'in_studio' ? 'In-Studio' : 'Off-Site Event';
      return res.json({ success: false, message: `Promo ini hanya berlaku untuk transaksi ${typeLabel}!` });
    }

    // 4. Check min spending limit
    const transactionAmount = Number(amount) || 0;
    if (transactionAmount < Number(promo.min_transaction)) {
      return res.json({
        success: false,
        message: `Total pembelanjaan minimum untuk promo ini adalah Rp ${new Intl.NumberFormat('id-ID').format(promo.min_transaction)}`
      });
    }

    // 5. Rule Specific validation
    if (promo.eligibility_type === 'weekday_slump' && promo.day_restrictions) {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = weekdays[transactionDate.getDay()]; // e.g. 'Mon'
      if (!promo.day_restrictions.includes(dayName)) {
        return res.json({
          success: false,
          message: 'Promo ini hanya valid untuk transaksi hari kerja sepi (Senin - Kamis).'
        });
      }
    }

    if (promo.eligibility_type === 'package_bundling' && promo.target_package_name) {
      if (!package_name || package_name.toLowerCase() !== promo.target_package_name.toLowerCase()) {
        return res.json({
          success: false,
          message: `Promo ini hanya berlaku jika Anda memesan Paket: ${promo.target_package_name}`
        });
      }
    }

    // 6. Calculate discount amount
    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = (transactionAmount * Number(promo.discount_value)) / 100;
    } else {
      discountAmount = Number(promo.discount_value);
    }

    // Discount cannot exceed transaction amount
    if (discountAmount > transactionAmount) {
      discountAmount = transactionAmount;
    }

    return res.json({
      success: true,
      message: 'Kode promo berhasil digunakan!',
      data: {
        promo_id: promo.promo_id,
        promo_code: promo.promo_code,
        promo_name: promo.promo_name,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        discount_amount: discountAmount
      }
    });
  });
});

module.exports = router;
