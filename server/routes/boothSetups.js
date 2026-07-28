const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const db = req.app.locals.db;

  const query = 'SELECT * FROM booth_setups ORDER BY booth_setup_name ASC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching booth setups:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching booth setups'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { booth_setup_name } = req.body;

  if (!booth_setup_name) {
    return res.status(400).json({
      success: false,
      message: 'Booth setup name is required'
    });
  }

  const query = 'INSERT INTO booth_setups (booth_setup_name) VALUES (?)';

  db.query(query, [booth_setup_name], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Booth setup name already exists'
        });
      }
      console.error('Error creating booth setup:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating booth setup'
      });
    }

    res.json({
      success: true,
      message: 'Booth setup created successfully',
      data: {
        booth_setup_id: result.insertId,
        booth_setup_name: booth_setup_name
      }
    });
  });
});

module.exports = router;
