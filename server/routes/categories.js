const express = require('express');
const router = express.Router();

// GET all categories
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT category_id, category_name, created_at
    FROM categories
    ORDER BY category_name ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching categories'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// POST create new category
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { category_name } = req.body;

  if (!category_name) {
    return res.status(400).json({
      success: false,
      message: 'Category name is required'
    });
  }

  const query = `
    INSERT INTO categories (category_name)
    VALUES (?)
  `;

  db.query(query, [category_name], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Category already exists'
        });
      }
      console.error('Error creating category:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating category'
      });
    }

    res.json({
      success: true,
      message: 'Category created successfully',
      data: {
        category_id: result.insertId,
        category_name
      }
    });
  });
});

// DELETE category
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const categoryId = req.params.id;

  const query = `DELETE FROM categories WHERE category_id = ?`;

  db.query(query, [categoryId], (err, result) => {
    if (err) {
      console.error('Error deleting category:', err);
      return res.status(500).json({
        success: false,
        message: 'Error deleting category'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  });
});

module.exports = router;
