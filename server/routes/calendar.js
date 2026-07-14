const express = require('express');
const router = express.Router();

// Get all calendar activities
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT
      activity_id,
      title,
      notes,
      activity_date,
      repeat_type,
      created_by,
      created_at
    FROM calendar_activities
    ORDER BY activity_date ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching calendar activities:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching calendar activities'
      });
    }

    // Generate repeated dates for activities with repeat_type
    const activities = [];
    const today = new Date();
    const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

    results.forEach(activity => {
      const baseDate = new Date(activity.activity_date);
      let currentDate = new Date(baseDate);

      // Add the original activity
      activities.push({
        ...activity,
        activity_date: currentDate.toISOString().split('T')[0]
      });

      // Generate repeated dates based on repeat_type
      if (activity.repeat_type !== 'none') {
        while (currentDate < oneYearLater) {
          switch (activity.repeat_type) {
            case 'daily':
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case 'weekly':
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case 'monthly':
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
            case 'yearly':
              currentDate.setFullYear(currentDate.getFullYear() + 1);
              break;
          }

          if (currentDate < oneYearLater) {
            activities.push({
              ...activity,
              activity_date: currentDate.toISOString().split('T')[0],
              is_repeat: true
            });
          }
        }
      }
    });

    // Sort by date
    activities.sort((a, b) => new Date(a.activity_date) - new Date(b.activity_date));

    res.json({
      success: true,
      data: activities
    });
  });
});

// Get single calendar activity
router.get('/:activity_id', (req, res) => {
  const db = req.app.locals.db;
  const { activity_id } = req.params;

  const query = `
    SELECT
      activity_id,
      title,
      notes,
      activity_date,
      repeat_type,
      created_by,
      created_at
    FROM calendar_activities
    WHERE activity_id = ?
  `;

  db.query(query, [activity_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching calendar activity'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar activity not found'
      });
    }

    const activity = results[0];
    activity.activity_date = new Date(activity.activity_date).toISOString().split('T')[0];

    res.json({
      success: true,
      data: activity
    });
  });
});

// Create new calendar activity
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { title, notes, activity_date, repeat_type, created_by } = req.body;

  if (!title || !activity_date || !created_by) {
    return res.status(400).json({
      success: false,
      message: 'Title, activity date, and created by are required'
    });
  }

  // Validate repeat_type
  const validRepeatTypes = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
  if (repeat_type && !validRepeatTypes.includes(repeat_type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid repeat type'
    });
  }

  if (!title || !activity_date || !created_by) {
    return res.status(400).json({
      success: false,
      message: 'Title, activity date, and created by are required'
    });
  }

  const query = `
    INSERT INTO calendar_activities (title, notes, activity_date, repeat_type, created_by)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [title, notes, activity_date, repeat_type || 'none', created_by], (err, result) => {
    if (err) {
      console.error('Error creating calendar activity:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating calendar activity'
      });
    }

    // Get the created activity
    const selectQuery = `
      SELECT
        activity_id,
        title,
        notes,
        activity_date,
        repeat_type,
        created_by,
        created_at
      FROM calendar_activities
      WHERE activity_id = ?
    `;

    db.query(selectQuery, [result.insertId], (err, results) => {
      if (err) {
        console.error('Error fetching created activity:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching created activity'
        });
      }

      const activity = results[0];
      activity.activity_date = new Date(activity.activity_date).toISOString().split('T')[0];

      res.json({
        success: true,
        message: 'Calendar activity created successfully',
        data: activity
      });
    });
  });
});

// Update calendar activity
router.put('/:activity_id', (req, res) => {
  const db = req.app.locals.db;
  const { activity_id } = req.params;
  const { title, notes, activity_date, repeat_type } = req.body;

  const query = `
    UPDATE calendar_activities
    SET title = ?, notes = ?, activity_date = ?, repeat_type = ?
    WHERE activity_id = ?
  `;

  db.query(query, [title, notes, activity_date, repeat_type || 'none', activity_id], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error updating calendar activity'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar activity not found'
      });
    }

    // Get the updated activity
    const selectQuery = `
      SELECT
        activity_id,
        title,
        notes,
        activity_date,
        repeat_type,
        created_by,
        created_at
      FROM calendar_activities
      WHERE activity_id = ?
    `;

    db.query(selectQuery, [activity_id], (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error fetching updated activity'
        });
      }

      const activity = results[0];
      activity.activity_date = new Date(activity.activity_date).toISOString().split('T')[0];

      res.json({
        success: true,
        message: 'Calendar activity updated successfully',
        data: activity
      });
    });
  });
});

// Delete calendar activity
router.delete('/:activity_id', (req, res) => {
  const db = req.app.locals.db;
  const { activity_id } = req.params;

  const query = 'DELETE FROM calendar_activities WHERE activity_id = ?';

  db.query(query, [activity_id], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting calendar activity'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar activity not found'
      });
    }

    res.json({
      success: true,
      message: 'Calendar activity deleted successfully'
    });
  });
});

module.exports = router;
