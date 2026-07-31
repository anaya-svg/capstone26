const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../asset_attachment');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'asset-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, category, search, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let query = 'SELECT * FROM assets WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM assets WHERE 1=1';
  const params = [];
  const countParams = [];

  if (status) {
    if (status === 'All Active Assets') {
      query += ' AND status IN ("Available", "In Use", "Maintenance")';
      countQuery += ' AND status IN ("Available", "In Use", "Maintenance")';
    } else {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }
  } else {
    query += ' AND status IN ("Available", "In Use", "Maintenance")';
    countQuery += ' AND status IN ("Available", "In Use", "Maintenance")';
  }

  if (category) {
    query += ' AND category = ?';
    countQuery += ' AND category = ?';
    params.push(category);
    countParams.push(category);
  }

  if (search) {
    query += ' AND name LIKE ?';
    countQuery += ' AND name LIKE ?';
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  query += ' ORDER BY created_at DESC';
  query += ` LIMIT ${limitNum} OFFSET ${offset}`;

  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error('Error counting assets:', err);
      return res.status(500).json({
        success: false,
        message: 'Error counting assets'
      });
    }

    const total = countResult[0].total;

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching assets:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching assets'
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
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'In Use' THEN 1 ELSE 0 END) as in_use,
      SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance,
      SUM(CASE WHEN status = 'Drafted' THEN 1 ELSE 0 END) as drafted,
      SUM(CASE WHEN status = 'Deleted' THEN 1 ELSE 0 END) as deleted
    FROM assets
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching assets summary:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching assets summary'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

router.get('/export', (req, res) => {
  const db = req.app.locals.db;
  const { status, category, condition, location, search } = req.query;

  let query = 'SELECT * FROM assets WHERE 1=1';
  const params = [];

  const appendInFilter = (column, values) => {
    const list = values.filter((v) => v && v.trim() !== '');
    if (list.length === 0) return;
    query += ` AND ${column} IN (${list.map(() => '?').join(',')})`;
    params.push(...list);
  };

  if (status) appendInFilter('status', status.split(','));
  if (category) appendInFilter('category', category.split(','));
  if (condition) appendInFilter('`condition`', condition.split(','));
  if (location) appendInFilter('location', location.split(','));

  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error exporting assets:', err);
      return res.status(500).json({
        success: false,
        message: 'Error exporting assets'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

router.get('/active', (req, res) => {
  const db = req.app.locals.db;
  const { search } = req.query;

  let query = `
    SELECT asset_id, name, category, status, location, \`condition\`, quantity
    FROM assets
    WHERE status IN ('Available', 'In Use')
  `;
  const params = [];

  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY name ASC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching active assets:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching active assets'
      });
    }

    const assetsWithStatus = results.map(asset => {
      const eventUsageQuery = `
        SELECT e.event_id, e.status
        FROM event_assets ea
        JOIN events e ON ea.event_id = e.event_id
        WHERE ea.asset_id = ?
      `;
      
      return new Promise((resolve) => {
        db.query(eventUsageQuery, [asset.asset_id], (err, eventResults) => {
          if (err) {
            console.error('Error checking event usage:', err);
            resolve(asset);
          } else {
            if (eventResults.length > 0) {
              const hasActiveEvent = eventResults.some(event => {
                const eventStatus = event.status.toLowerCase();
                return eventStatus === 'in_progress' || eventStatus === 'upcoming';
              });
              
              if (hasActiveEvent) {
                const activeEvent = eventResults.find(event => {
                  const eventStatus = event.status.toLowerCase();
                  return eventStatus === 'in_progress' || eventStatus === 'upcoming';
                });
                resolve({
                  ...asset,
                  status: 'In Use',
                  in_use_event: activeEvent.event_id
                });
              } else {
                resolve(asset);
              }
            } else {
              resolve(asset);
            }
          }
        });
      });
    });

    Promise.all(assetsWithStatus).then(finalResults => {
      res.json({
        success: true,
        data: finalResults
      });
    });
  });
});

router.get('/:asset_id', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id } = req.params;

  const query = 'SELECT * FROM assets WHERE asset_id = ?';

  db.query(query, [asset_id], (err, results) => {
    if (err) {
      console.error('Error fetching asset:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching asset'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const asset = results[0];

    const eventUsageQuery = `
      SELECT e.event_id, e.status
      FROM event_assets ea
      JOIN events e ON ea.event_id = e.event_id
      WHERE ea.asset_id = ?
    `;

    db.query(eventUsageQuery, [asset_id], (err, eventResults) => {
      if (err) {
        console.error('Error checking event usage:', err);
        return res.json({
          success: true,
          data: asset
        });
      }

      if (eventResults.length > 0) {
        const hasActiveEvent = eventResults.some(event => {
          const eventStatus = event.status.toLowerCase();
          return eventStatus === 'in_progress' || eventStatus === 'upcoming';
        });
        
        if (hasActiveEvent) {
          const activeEvent = eventResults.find(event => {
            const eventStatus = event.status.toLowerCase();
            return eventStatus === 'in_progress' || eventStatus === 'upcoming';
          });
          return res.json({
            success: true,
            data: {
              ...asset,
              status: 'In Use',
              in_use_event: activeEvent.event_id
            }
          });
        }
      }

      res.json({
        success: true,
        data: asset
      });
    });
  });
});

router.get('/:asset_id/events', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id } = req.params;

  const query = `
    SELECT e.event_id, e.event_name, e.customer, e.status, e.start_date, e.end_date, e.location, ea.quantity
    FROM event_assets ea
    JOIN events e ON ea.event_id = e.event_id
    WHERE ea.asset_id = ?
    AND e.status IN ('upcoming', 'in_progress')
    ORDER BY e.start_date ASC
  `;

  db.query(query, [asset_id], (err, results) => {
    if (err) {
      console.error('Error fetching asset events:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching asset events'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

router.post('/', upload.single('photo_attachment'), (req, res) => {
  const db = req.app.locals.db;
  const { name, category, status, location, condition, quantity, has_barcode } = req.body;
  const photo_attachment = req.file ? `/asset_attachment/${req.file.filename}` : null;

  const checkQuery = `SELECT * FROM assets WHERE name = ?`;

  db.query(checkQuery, [name], (err, results) => {
    if (err) {
      console.error('Error checking asset name:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking asset name'
      });
    }

    if (results.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Asset name already exists'
      });
    }

    const query = `
      INSERT INTO assets (name, category, status, location, \`condition\`, quantity, photo_attachment, has_barcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [name, category, status, location, condition, quantity || 1, photo_attachment, has_barcode === 'true' ? 1 : 0], (err, result) => {
      if (err) {
        console.error('Error creating asset:', err);
        return res.status(500).json({
          success: false,
          message: 'Error creating asset'
        });
      }

      const selectQuery = 'SELECT * FROM assets WHERE asset_id = ?';
      db.query(selectQuery, [result.insertId], (err, results) => {
        if (err) {
          console.error('Error fetching created asset:', err);
          return res.status(500).json({
            success: false,
            message: 'Error fetching created asset'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Asset created successfully',
          data: results[0]
        });
      });
    });
  });
});

router.put('/:asset_id', upload.single('photo_attachment'), (req, res) => {
  const db = req.app.locals.db;
  const { asset_id } = req.params;
  const { name, category, status, location, condition, quantity, has_barcode } = req.body;
  const photo_attachment = req.file ? `/asset_attachment/${req.file.filename}` : null;

  const checkQuery = `SELECT * FROM assets WHERE name = ? AND asset_id != ?`;

  db.query(checkQuery, [name, asset_id], (err, results) => {
    if (err) {
      console.error('Error checking asset name:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking asset name'
      });
    }

    if (results.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Asset name already exists'
      });
    }

    const getCurrentQuery = 'SELECT * FROM assets WHERE asset_id = ?';
    db.query(getCurrentQuery, [asset_id], (err, results) => {
      if (err) {
        console.error('Error fetching current asset:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching current asset'
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Asset not found'
        });
      }

      const currentAsset = results[0];
      const photo_attachment = req.file ? `/asset_attachment/${req.file.filename}` : currentAsset.photo_attachment;

      const query = `
        UPDATE assets
        SET name = ?, category = ?, status = ?, location = ?, \`condition\` = ?, quantity = ?, photo_attachment = ?, has_barcode = ?
        WHERE asset_id = ?
      `;

      db.query(query, [name, category, status, location, condition, quantity || 1, photo_attachment, has_barcode === 'true' ? 1 : 0, asset_id], (err, result) => {
        if (err) {
          console.error('Error updating asset:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating asset'
          });
        }

        const selectQuery = 'SELECT * FROM assets WHERE asset_id = ?';
        db.query(selectQuery, [asset_id], (err, results) => {
          if (err) {
            console.error('Error fetching updated asset:', err);
            return res.status(500).json({
              success: false,
              message: 'Error fetching updated asset'
            });
          }

          res.json({
            success: true,
            message: 'Asset updated successfully',
            data: results[0]
          });
        });
      });
    });
  });
});

router.put('/:asset_id/draft', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id } = req.params;

  const eventUsageQuery = `
    SELECT e.event_id, e.event_name, e.customer, e.status, ea.quantity
    FROM event_assets ea
    JOIN events e ON ea.event_id = e.event_id
    WHERE ea.asset_id = ?
    AND e.status IN ('upcoming', 'in_progress')
  `;

  const procurementUsageQuery = `
    SELECT pr.pr_id, pri.quantity, pr.status
    FROM procurement_request_items pri
    JOIN procurement_requests pr ON pr.pr_id = pri.pr_id
    WHERE pri.asset_id = ?
    AND pr.status IN ('Waiting Approval', 'Approved')
  `;

  let eventUsage = null;
  let procurementUsage = null;

  db.query(eventUsageQuery, [asset_id], (err, eventResults) => {
    if (err) {
      console.error('Error checking event usage:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking asset usage'
      });
    }

    eventUsage = eventResults;

    db.query(procurementUsageQuery, [asset_id], (err, procurementResults) => {
      if (err) {
        console.error('Error checking procurement usage:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking asset usage'
        });
      }

      procurementUsage = procurementResults;

      if (eventUsage.length > 0 || procurementUsage.length > 0) {
        const usageDetails = [];

        if (eventUsage.length > 0) {
          eventUsage.forEach(event => {
            usageDetails.push({
              type: 'Events & Booths',
              id: event.event_id,
              name: event.event_name,
              customer: event.customer,
              status: event.status,
              quantity: event.quantity
            });
          });
        }

        if (procurementUsage.length > 0) {
          procurementUsage.forEach(pr => {
            usageDetails.push({
              type: 'Procurement',
              id: pr.pr_id,
              quantity: pr.quantity,
              status: pr.status
            });
          });
        }

        return res.json({
          success: false,
          message: 'Asset cannot be drafted because it is in use',
          usage: usageDetails
        });
      }

      const query = 'UPDATE assets SET status = "Drafted" WHERE asset_id = ?';

      db.query(query, [asset_id], (err, result) => {
        if (err) {
          console.error('Error drafting asset:', err);
          return res.status(500).json({
            success: false,
            message: 'Error drafting asset'
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Asset not found'
          });
        }

        const selectQuery = 'SELECT * FROM assets WHERE asset_id = ?';
        db.query(selectQuery, [asset_id], (err, results) => {
          if (err) {
            console.error('Error fetching updated asset:', err);
            return res.status(500).json({
              success: false,
              message: 'Error fetching updated asset'
            });
          }

          res.json({
            success: true,
            message: 'Asset drafted successfully',
            data: results[0]
          });
        });
      });
    });
  });
});

router.put('/:asset_id/undraft', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id } = req.params;

  const query = 'UPDATE assets SET status = "Available" WHERE asset_id = ?';

  db.query(query, [asset_id], (err, result) => {
    if (err) {
      console.error('Error undrafting asset:', err);
      return res.status(500).json({
        success: false,
        message: 'Error undrafting asset'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const selectQuery = 'SELECT * FROM assets WHERE asset_id = ?';
    db.query(selectQuery, [asset_id], (err, results) => {
      if (err) {
        console.error('Error fetching updated asset:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching updated asset'
        });
      }

      res.json({
        success: true,
        message: 'Asset undrafted successfully',
        data: results[0]
      });
    });
  });
});

router.put('/:asset_id/delete', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id } = req.params;
  const { deleted_reason } = req.body;

  const eventUsageQuery = `
    SELECT e.event_id, e.event_name, e.customer, e.status, ea.quantity
    FROM event_assets ea
    JOIN events e ON ea.event_id = e.event_id
    WHERE ea.asset_id = ?
    AND e.status IN ('upcoming', 'in_progress')
  `;

  const procurementUsageQuery = `
    SELECT pr.pr_id, pri.quantity, pr.status
    FROM procurement_request_items pri
    JOIN procurement_requests pr ON pri.pr_id = pr.pr_id
    WHERE pri.asset_id = ?
    AND pr.status IN ('Waiting Approval', 'Approved')
  `;

  let eventUsage = null;
  let procurementUsage = null;

  db.query(eventUsageQuery, [asset_id], (err, eventResults) => {
    if (err) {
      console.error('Error checking event usage:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking asset usage'
      });
    }

    eventUsage = eventResults;

    db.query(procurementUsageQuery, [asset_id], (err, procurementResults) => {
      if (err) {
        console.error('Error checking procurement usage:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking asset usage'
        });
      }

      procurementUsage = procurementResults;

      if (eventUsage.length > 0 || procurementUsage.length > 0) {
        const usageDetails = [];

        if (eventUsage.length > 0) {
          eventUsage.forEach(event => {
            usageDetails.push({
              type: 'Events & Booths',
              id: event.event_id,
              name: event.event_name,
              customer: event.customer,
              status: event.status,
              quantity: event.quantity
            });
          });
        }

        if (procurementUsage.length > 0) {
          procurementUsage.forEach(pr => {
            usageDetails.push({
              type: 'Procurement',
              id: pr.pr_id,
              quantity: pr.quantity,
              status: pr.status
            });
          });
        }

        return res.json({
          success: false,
          message: 'Asset cannot be deleted because it is in use',
          usage: usageDetails
        });
      }

      const query = 'UPDATE assets SET status = "Deleted", deleted_reason = ? WHERE asset_id = ?';

      db.query(query, [deleted_reason, asset_id], (err, result) => {
        if (err) {
          console.error('Error deleting asset:', err);
          return res.status(500).json({
            success: false,
            message: 'Error deleting asset'
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Asset not found'
          });
        }

        const selectQuery = 'SELECT * FROM assets WHERE asset_id = ?';
        db.query(selectQuery, [asset_id], (err, results) => {
          if (err) {
            console.error('Error fetching updated asset:', err);
            return res.status(500).json({
              success: false,
              message: 'Error fetching updated asset'
            });
          }

          res.json({
            success: true,
            message: 'Asset deleted successfully',
            data: results[0]
          });
        });
      });
    });
  });
});

router.put('/:asset_id/delete-drafted', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id } = req.params;
  const { deleted_reason } = req.body;

  const eventUsageQuery = `
    SELECT e.event_id, e.event_name, e.customer, e.status, ea.quantity
    FROM event_assets ea
    JOIN events e ON ea.event_id = e.event_id
    WHERE ea.asset_id = ?
    AND e.status IN ('upcoming', 'in_progress')
  `;

  const procurementUsageQuery = `
    SELECT pr.pr_id, pri.quantity, pr.status
    FROM procurement_request_items pri
    JOIN procurement_requests pr ON pri.pr_id = pr.pr_id
    WHERE pri.asset_id = ?
    AND pr.status IN ('Waiting Approval', 'Approved')
  `;

  let eventUsage = null;
  let procurementUsage = null;

  db.query(eventUsageQuery, [asset_id], (err, eventResults) => {
    if (err) {
      console.error('Error checking event usage:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking asset usage'
      });
    }

    eventUsage = eventResults;

    db.query(procurementUsageQuery, [asset_id], (err, procurementResults) => {
      if (err) {
        console.error('Error checking procurement usage:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking asset usage'
        });
      }

      procurementUsage = procurementResults;

      if (eventUsage.length > 0 || procurementUsage.length > 0) {
        const usageDetails = [];

        if (eventUsage.length > 0) {
          eventUsage.forEach(event => {
            usageDetails.push({
              type: 'Events & Booths',
              id: event.event_id,
              name: event.event_name,
              customer: event.customer,
              status: event.status,
              quantity: event.quantity
            });
          });
        }

        if (procurementUsage.length > 0) {
          procurementUsage.forEach(pr => {
            usageDetails.push({
              type: 'Procurement',
              id: pr.pr_id,
              quantity: pr.quantity,
              status: pr.status
            });
          });
        }

        return res.json({
          success: false,
          message: 'Asset cannot be deleted because it is in use',
          usage: usageDetails
        });
      }

      const query = 'UPDATE assets SET status = "Deleted Draft", deleted_reason = ? WHERE asset_id = ?';

      db.query(query, [deleted_reason, asset_id], (err, result) => {
        if (err) {
          console.error('Error deleting drafted asset:', err);
          return res.status(500).json({
            success: false,
            message: 'Error deleting drafted asset'
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Asset not found'
          });
        }

        const selectQuery = 'SELECT * FROM assets WHERE asset_id = ?';
        db.query(selectQuery, [asset_id], (err, results) => {
          if (err) {
            console.error('Error fetching updated asset:', err);
            return res.status(500).json({
              success: false,
              message: 'Error fetching updated asset'
            });
          }

          res.json({
            success: true,
            message: 'Drafted asset deleted successfully',
            data: results[0]
          });
        });
      });
    });
  });
});

router.delete('/:asset_id/hard-delete', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id } = req.params;

  db.query('DELETE FROM event_assets WHERE asset_id = ?', [asset_id], (err) => {
    if (err) {
      console.error('Error deleting event assets:', err);
    }
  });

  db.query('DELETE FROM procurement_request_items WHERE asset_id = ?', [asset_id], (err) => {
    if (err) {
      console.error('Error deleting procurement request items:', err);
    }
  });

  const deleteAssetQuery = 'DELETE FROM assets WHERE asset_id = ?';
  db.query(deleteAssetQuery, [asset_id], (err, result) => {
    if (err) {
      console.error('Error deleting asset:', err);
      return res.status(500).json({
        success: false,
        message: 'Error deleting asset'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    res.json({
      success: true,
      message: 'Asset permanently deleted'
    });
  });
});

module.exports = router;
