const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { search, role, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT id, full_name, email, role, is_verified, status, last_login, created_at
    FROM users
    WHERE 1=1
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM users
    WHERE 1=1
  `;
  const params = [];
  const countParams = [];

  if (role && role !== 'all') {
    query += ' AND role = ?';
    countQuery += ' AND role = ?';
    params.push(role);
    countParams.push(role);
  }

  if (search) {
    query += ' AND (full_name LIKE ? OR email LIKE ?)';
    countQuery += ' AND (full_name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';
  query += ` LIMIT ${limitNum} OFFSET ${offset}`;

  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error('Error counting users:', err);
      return res.status(500).json({
        success: false,
        message: 'Error counting users'
      });
    }

    const total = countResult[0].total;

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching users'
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

router.get('/summary', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT
      COUNT(*) as total_users,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as administrators
    FROM users
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users summary:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching users summary'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.params.id;

  const query = `
    SELECT id, full_name, email, role, is_verified, status, last_login, created_at
    FROM users
    WHERE id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching user'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { full_name, email, password, role, status } = req.body;

  const checkQuery = `SELECT id FROM users WHERE email = ?`;
  db.query(checkQuery, [email], (err, results) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking email'
      });
    }

    if (results.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({
          success: false,
          message: 'Error hashing password'
        });
      }

      const query = `
        INSERT INTO users (full_name, email, password, role, is_verified, status)
        VALUES (?, ?, ?, ?, TRUE, ?)
      `;

      db.query(query, [full_name, email, hashedPassword, role, status], (err, result) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({
            success: false,
            message: 'Error creating user'
          });
        }

        res.json({
          success: true,
          message: 'User created successfully',
          data: {
            id: result.insertId,
            full_name,
            email,
            role,
            status
          }
        });
      });
    });
  });
});

router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.params.id;
  const { full_name, email, role, status } = req.body;

  const checkQuery = `SELECT id FROM users WHERE email = ? AND id != ?`;
  db.query(checkQuery, [email, userId], (err, results) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking email'
      });
    }

    if (results.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const query = `
      UPDATE users
      SET full_name = ?, email = ?, role = ?, status = ?
      WHERE id = ?
    `;

    db.query(query, [full_name, email, role, status, userId], (err, result) => {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({
          success: false,
          message: 'Error updating user'
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully'
      });
    });
  });
});

router.put('/:id/password', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.params.id;
  const { password } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).json({
        success: false,
        message: 'Error hashing password'
      });
    }

    const query = `UPDATE users SET password = ? WHERE id = ?`;

    db.query(query, [hashedPassword, userId], (err, result) => {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({
          success: false,
          message: 'Error updating password'
        });
      }

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    });
  });
});

router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.params.id;

  const query = `DELETE FROM users WHERE id = ?`;

  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  });
});

module.exports = router;
