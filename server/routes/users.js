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
    SELECT id, full_name, email, role, is_verified, status, last_login, created_at, created_by, updated_by
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

      const creator = req.body.created_by || 'System';

      const query = `
        INSERT INTO users (full_name, email, password, role, is_verified, status, created_by, updated_by)
        VALUES (?, ?, ?, ?, TRUE, ?, ?, ?)
      `;

      db.query(query, [full_name, email, hashedPassword, role, status, creator, creator], (err, result) => {
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
  const { full_name, email, role, status, updated_by } = req.body;

  if (!full_name || !email || !role || !status) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }

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
      SET full_name = ?, email = ?, role = ?, status = ?, updated_by = ?
      WHERE id = ?
    `;

    db.query(query, [full_name, email, role, status, updated_by || 'N/A', userId], (err, result) => {
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

  // First, get the user's full_name to check for records
  const getUserQuery = `SELECT full_name, email FROM users WHERE id = ?`;
  db.query(getUserQuery, [userId], (err, userResults) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching user'
      });
    }

    if (userResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userFullName = userResults[0].full_name;
    const userEmail = userResults[0].email;

    // Check if user has any records in the system
    const checkQueries = [
      { table: 'users', query: `SELECT COUNT(*) as count FROM users WHERE created_by = ? OR updated_by = ?` },
      { table: 'procurement_requests', query: `SELECT COUNT(*) as count FROM procurement_requests WHERE requested_by = ? OR updated_by = ?` },
      { table: 'events', query: `SELECT COUNT(*) as count FROM events WHERE created_by = ? OR updated_by = ?` },
      { table: 'calendar_activities', query: `SELECT COUNT(*) as count FROM calendar_activities WHERE created_by = ? OR updated_by = ?` },
      { table: 'assets', query: `SELECT COUNT(*) as count FROM assets WHERE created_by = ? OR updated_by = ?` },
      { table: 'customers', query: `SELECT COUNT(*) as count FROM customers WHERE created_by = ? OR updated_by = ?` },
      { table: 'customer_visits', query: `SELECT COUNT(*) as count FROM customer_visits WHERE created_by = ? OR updated_by = ?` },
      { table: 'inventory', query: `SELECT COUNT(*) as count FROM inventory WHERE created_by = ? OR updated_by = ?` }
    ];

    let completedChecks = 0;
    let hasRecords = false;
    let recordTables = [];

    checkQueries.forEach(({ table, query }) => {
      db.query(query, [userFullName, userFullName], (err, results) => {
        if (err) {
          console.error(`Error checking ${table}:`, err);
        } else {
          if (results[0].count > 0) {
            hasRecords = true;
            recordTables.push(table);
          }
        }

        completedChecks++;
        if (completedChecks === checkQueries.length) {
          if (hasRecords) {
            return res.status(403).json({
              success: false,
              message: 'This user cannot be deleted because they have created or updated records in the system. Please contact the IT team for assistance.',
              hasRecords: true,
              recordTables
            });
          }

          // If no records found, proceed with deletion
          const deleteQuery = `DELETE FROM users WHERE id = ?`;
          db.query(deleteQuery, [userId], (err, result) => {
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
        }
      });
    });
  });
});

module.exports = router;
