const express = require('express');
const router = express.Router();

// GET all UOM
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT uom_id, uom_name, created_at
    FROM uom
    ORDER BY uom_name ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching UOM:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching UOM'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// POST create new UOM
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { uom_name } = req.body;

  if (!uom_name) {
    return res.status(400).json({
      success: false,
      message: 'UOM name is required'
    });
  }

  const query = `
    INSERT INTO uom (uom_name)
    VALUES (?)
  `;

  db.query(query, [uom_name], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'UOM already exists'
        });
      }
      console.error('Error creating UOM:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating UOM'
      });
    }

    res.json({
      success: true,
      message: 'UOM created successfully',
      data: {
        uom_id: result.insertId,
        uom_name
      }
    });
  });
});

// PUT update UOM
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const uomId = req.params.id;
  const { uom_name } = req.body;

  if (!uom_name) {
    return res.status(400).json({
      success: false,
      message: 'UOM name is required'
    });
  }

  const query = `
    UPDATE uom
    SET uom_name = ?
    WHERE uom_id = ?
  `;

  db.query(query, [uom_name, uomId], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'UOM already exists'
        });
      }
      console.error('Error updating UOM:', err);
      return res.status(500).json({
        success: false,
        message: 'Error updating UOM'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'UOM not found'
      });
    }

    res.json({
      success: true,
      message: 'UOM updated successfully',
      data: {
        uom_id: parseInt(uomId),
        uom_name
      }
    });
  });
});

// DELETE UOM
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const uomId = req.params.id;

  const query = `DELETE FROM uom WHERE uom_id = ?`;

  db.query(query, [uomId], (err, result) => {
    if (err) {
      console.error('Error deleting UOM:', err);
      return res.status(500).json({
        success: false,
        message: 'Error deleting UOM'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'UOM not found'
      });
    }

    res.json({
      success: true,
      message: 'UOM deleted successfully'
    });
  });
});

module.exports = router;
