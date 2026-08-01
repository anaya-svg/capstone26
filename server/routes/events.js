const express = require('express');
const router = express.Router();

function determineStatus(startDate, endDate) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (now < start) {
    return 'upcoming';
  } else if (now >= start && now <= end) {
    return 'in_progress';
  } else {
    return 'completed';
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function dateRangesOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  
  s1.setHours(0, 0, 0, 0);
  e1.setHours(0, 0, 0, 0);
  s2.setHours(0, 0, 0, 0);
  e2.setHours(0, 0, 0, 0);
  
  return s1 <= e2 && e1 >= s2;
}

function getAssetConflicts(db, { start_date, end_date, asset_ids, exclude_event_id }, callback) {
  if (!start_date || !end_date || !asset_ids || asset_ids.length === 0) {
    return callback(null, []);
  }

  const assetIdsString = asset_ids.map(() => '?').join(',');
  const params = [...asset_ids];

  let query = `
    SELECT DISTINCT
      e.event_id,
      e.event_name,
      e.start_date,
      e.end_date,
      e.status,
      a.asset_id,
      a.name as asset_name
    FROM events e
    JOIN event_assets ea ON e.event_id = ea.event_id
    JOIN assets a ON ea.asset_id = a.asset_id
    WHERE ea.asset_id IN (${assetIdsString})
    AND e.status IN ('upcoming', 'in_progress')
  `;

  if (exclude_event_id) {
    query += ' AND e.event_id != ?';
    params.push(exclude_event_id);
  }

  db.query(query, params, (err, results) => {
    if (err) return callback(err);

    const conflicts = results.filter(event => {
      return dateRangesOverlap(start_date, end_date, event.start_date, event.end_date);
    });

    const conflictsByAsset = {};
    conflicts.forEach(conflict => {
      if (!conflictsByAsset[conflict.asset_id]) {
        conflictsByAsset[conflict.asset_id] = {
          asset_id: conflict.asset_id,
          asset_name: conflict.asset_name,
          conflicting_events: []
        };
      }
      conflictsByAsset[conflict.asset_id].conflicting_events.push({
        event_id: conflict.event_id,
        event_name: conflict.event_name,
        start_date: formatDate(conflict.start_date),
        end_date: formatDate(conflict.end_date),
        status: conflict.status
      });
    });

    const inUseQuery = `
      SELECT asset_id, name as asset_name, status
      FROM assets
      WHERE asset_id IN (${assetIdsString})
      AND status = 'In Use'
    `;

    db.query(inUseQuery, asset_ids, (inUseErr, inUseResults) => {
      if (inUseErr) return callback(inUseErr);

      inUseResults.forEach(asset => {
        if (!conflictsByAsset[asset.asset_id]) {
          conflictsByAsset[asset.asset_id] = {
            asset_id: asset.asset_id,
            asset_name: asset.asset_name,
            conflicting_events: [],
            is_in_use: true
          };
        } else {
          conflictsByAsset[asset.asset_id].is_in_use = true;
        }
      });

      const conflictList = Object.values(conflictsByAsset);
      callback(null, conflictList);
    });
  });
}

function updateAssetStatusByEventStatus(event_id, newStatus, db) {
  const query = `
    SELECT a.asset_id
    FROM assets a
    JOIN event_assets ea ON a.asset_id = ea.asset_id
    WHERE ea.event_id = ?
  `;
  
  db.query(query, [event_id], (err, results) => {
    if (err) {
      console.error('Error fetching event assets:', err);
      return;
    }
    
    if (results.length === 0) return;
    
    const assetIds = results.map(r => r.asset_id);
    const assetIdsString = assetIds.map(() => '?').join(',');
    
    if (newStatus === 'in_progress') {
      db.query(
        `UPDATE assets SET status = 'In Use' WHERE asset_id IN (${assetIdsString})`,
        assetIds,
        (err) => {
          if (err) console.error('Error updating asset status to In Use:', err);
        }
      );
    } else if (newStatus === 'completed' || newStatus === 'cancelled') {
      const checkQuery = `
        SELECT DISTINCT a.asset_id
        FROM assets a
        JOIN event_assets ea ON a.asset_id = ea.asset_id
        JOIN events e ON ea.event_id = e.event_id
        WHERE a.asset_id IN (${assetIdsString})
        AND e.status = 'in_progress'
        AND e.event_id != ?
      `;
      
      db.query(checkQuery, [...assetIds, event_id], (err, inProgressResults) => {
        if (err) {
          console.error('Error checking in_progress events:', err);
          return;
        }
        
        const inProgressAssetIds = inProgressResults.map(r => r.asset_id);
        
        assetIds.forEach(assetId => {
          if (!inProgressAssetIds.includes(assetId)) {
            db.query(
              'UPDATE assets SET status = "Available" WHERE asset_id = ?',
              [assetId],
              (err) => {
                if (err) console.error('Error updating asset status to Available:', err);
              }
            );
          }
        });
      });
    }
  });
}

router.post('/recalculate-asset-statuses', (req, res) => {
  const db = req.app.locals.db;
  
  db.query(
    `UPDATE assets SET status = 'Available' WHERE status NOT IN ('Maintenance', 'Drafted', 'Deleted', 'Deleted Draft')`,
    (err) => {
      if (err) {
        console.error('Error resetting asset statuses:', err);
        return res.status(500).json({ success: false, message: 'Error resetting asset statuses' });
      }
      
      const query = `
        SELECT DISTINCT a.asset_id
        FROM assets a
        JOIN event_assets ea ON a.asset_id = ea.asset_id
        JOIN events e ON ea.event_id = e.event_id
        WHERE e.status = 'in_progress'
        AND a.status NOT IN ('Maintenance', 'Drafted', 'Deleted', 'Deleted Draft')
      `;
      
      db.query(query, (err, results) => {
        if (err) {
          console.error('Error fetching in_progress assets:', err);
          return res.status(500).json({ success: false, message: 'Error fetching in_progress assets' });
        }
        
        if (results.length === 0) {
          return res.json({ success: true, message: 'Asset statuses recalculated successfully', updated_count: 0 });
        }
        
        const assetIds = results.map(r => r.asset_id);
        const assetIdsString = assetIds.map(() => '?').join(',');
        
        db.query(
          `UPDATE assets SET status = 'In Use' WHERE asset_id IN (${assetIdsString})`,
          assetIds,
          (err, updateResult) => {
            if (err) {
              console.error('Error updating asset statuses to In Use:', err);
              return res.status(500).json({ success: false, message: 'Error updating asset statuses' });
            }
            
            res.json({
              success: true,
              message: 'Asset statuses recalculated successfully',
              updated_count: updateResult.affectedRows
            });
          }
        );
      });
    }
  );
});

function getSuggestedSubstitutes(db, assetId, startDate, endDate, excludeEventId) {
  return new Promise((resolve) => {
    db.query('SELECT category_id, name, location FROM assets WHERE asset_id = ?', [assetId], (err, assetRes) => {
      if (err || !assetRes || assetRes.length === 0) return resolve([]);
      const categoryId = assetRes[0].category_id;
      const originalLocation = assetRes[0].location;

      if (!categoryId) return resolve([]);

      const candidateQuery = `
        SELECT asset_id, name, status, location
        FROM assets
        WHERE category_id = ?
          AND asset_id != ?
          AND status NOT IN ('Deleted', 'Deleted Draft', 'Retired')
      `;

      db.query(candidateQuery, [categoryId, assetId], (err, candidates) => {
        if (err || !candidates || candidates.length === 0) return resolve([]);

        const candidateIds = candidates.map(c => c.asset_id);
        const candidateIdsString = candidateIds.map(() => '?').join(',');

        let overlapQuery = `
          SELECT DISTINCT ea.asset_id
          FROM event_assets ea
          JOIN events e ON e.event_id = ea.event_id
          WHERE ea.asset_id IN (${candidateIdsString})
            AND e.status IN ('upcoming', 'in_progress')
        `;
        const params = [...candidateIds];

        if (excludeEventId) {
          overlapQuery += ' AND e.event_id != ?';
          params.push(excludeEventId);
        }

        db.query(overlapQuery, params, (err, overlaps) => {
          if (err || !overlaps) {
            const subs = candidates.map(c => {
              let similarity = 90;
              if (c.location === originalLocation) similarity += 5;
              if (c.status === 'Available') similarity += 3;
              return {
                asset_id: c.asset_id,
                name: c.name,
                status: c.status,
                location: c.location,
                similarity_rating: Math.min(similarity, 99),
                is_available: c.status === 'Available'
              };
            }).filter(c => c.is_available);
            return resolve(subs.slice(0, 3));
          }

          const overlappedAssetIds = new Set(overlaps.map(o => o.asset_id));

          const substitutes = candidates.map(c => {
            const isOverlapped = overlappedAssetIds.has(c.asset_id) || c.status === 'In Use' || c.status === 'Maintenance';
            
            let similarity = 90; 
            if (c.location === originalLocation) {
              similarity += 5; 
            }
            if (c.status === 'Available') {
              similarity += 3; 
            }

            return {
              asset_id: c.asset_id,
              name: c.name,
              status: c.status,
              location: c.location,
              similarity_rating: Math.min(similarity, 99),
              is_available: !isOverlapped
            };
          }).filter(c => c.is_available); 

          substitutes.sort((a, b) => b.similarity_rating - a.similarity_rating);

          resolve(substitutes.slice(0, 3)); 
        });
      });
    });
  });
}

router.post('/check-asset-conflicts', (req, res) => {
  const db = req.app.locals.db;
  const { start_date, end_date, asset_ids, exclude_event_id } = req.body;
  
  if (!start_date || !end_date || !asset_ids || !Array.isArray(asset_ids)) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: start_date, end_date, asset_ids'
    });
  }
  
  const assetIdsString = asset_ids.map(() => '?').join(',');
  const params = [...asset_ids];
  
  let query = `
    SELECT DISTINCT
      e.event_id,
      e.event_name,
      e.start_date,
      e.end_date,
      e.status,
      a.asset_id,
      a.name as asset_name
    FROM events e
    JOIN event_assets ea ON e.event_id = ea.event_id
    JOIN assets a ON ea.asset_id = a.asset_id
    WHERE ea.asset_id IN (${assetIdsString})
    AND e.status IN ('upcoming', 'in_progress')
  `;
  
  if (exclude_event_id) {
    query += ' AND e.event_id != ?';
    params.push(exclude_event_id);
  }
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error checking asset conflicts:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking asset conflicts'
      });
    }
    
    const conflicts = results.filter(event => {
      return dateRangesOverlap(start_date, end_date, event.start_date, event.end_date);
    });
    
    const conflictsByAsset = {};
    conflicts.forEach(conflict => {
      if (!conflictsByAsset[conflict.asset_id]) {
        conflictsByAsset[conflict.asset_id] = {
          asset_id: conflict.asset_id,
          asset_name: conflict.asset_name,
          conflicting_events: []
        };
      }
      conflictsByAsset[conflict.asset_id].conflicting_events.push({
        event_id: conflict.event_id,
        event_name: conflict.event_name,
        start_date: formatDate(conflict.start_date),
        end_date: formatDate(conflict.end_date),
        status: conflict.status
      });
    });
    
    const conflictList = Object.values(conflictsByAsset);
    
    const inUseQuery = `
      SELECT asset_id, name as asset_name, status
      FROM assets
      WHERE asset_id IN (${assetIdsString})
      AND status = 'In Use'
    `;
    
    db.query(inUseQuery, asset_ids, (err, inUseResults) => {
      if (err) {
        console.error('Error checking in-use assets:', err);
      } else {
        inUseResults.forEach(asset => {
          if (!conflictsByAsset[asset.asset_id]) {
            conflictsByAsset[asset.asset_id] = {
              asset_id: asset.asset_id,
              asset_name: asset.asset_name,
              conflicting_events: [],
              is_in_use: true
            };
          } else {
            conflictsByAsset[asset.asset_id].is_in_use = true;
          }
        });
      }
      
      const finalConflictList = Object.values(conflictsByAsset);
      
      if (finalConflictList.length === 0) {
        return res.json({
          success: true,
          has_conflicts: false,
          conflicts: []
        });
      }

      const substitutePromises = finalConflictList.map(async (conflict) => {
        const substitutes = await getSuggestedSubstitutes(db, conflict.asset_id, start_date, end_date, exclude_event_id);
        return {
          ...conflict,
          suggested_substitutes: substitutes
        };
      });

      Promise.all(substitutePromises).then((conflictsWithSubstitutes) => {
        res.json({
          success: true,
          has_conflicts: true,
          conflicts: conflictsWithSubstitutes
        });
      });
    });
  });
});

router.get('/export', (req, res) => {
  const db = req.app.locals.db;
  const { status, startDate, endDate, search } = req.query;

  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];

  const appendInFilter = (column, values) => {
    const list = values.filter((v) => v && v.trim() !== '');
    if (list.length === 0) return;
    query += ` AND ${column} IN (${list.map(() => '?').join(',')})`;
    params.push(...list);
  };

  if (status) appendInFilter('status', status.split(','));

  if (startDate && endDate) {
    query += ' AND (DATE(start_date) <= ? AND DATE(end_date) >= ?)';
    params.push(endDate, startDate);
  } else if (startDate) {
    query += ' AND DATE(end_date) >= ?';
    params.push(startDate);
  } else if (endDate) {
    query += ' AND DATE(start_date) <= ?';
    params.push(endDate);
  }

  if (search) {
    query += ' AND (event_name LIKE ? OR customer LIKE ? OR location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error exporting events:', err);
      return res.status(500).json({
        success: false,
        message: 'Error exporting events'
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

  const updateQuery = `
    UPDATE events
    SET status = CASE
      WHEN status != 'cancelled' THEN
        CASE
          WHEN CURDATE() < DATE(start_date) THEN 'upcoming'
          WHEN CURDATE() >= DATE(start_date) AND CURDATE() <= DATE(end_date) THEN 'in_progress'
          ELSE 'completed'
        END
      ELSE status
    END
  `;

  db.query(updateQuery, (updateErr) => {
    if (updateErr) {
      console.error('Error auto-updating event status:', updateErr);
    }

    const summaryQuery = `
      SELECT
        event_id,
        event_name,
        start_date,
        end_date,
        status
      FROM events
    `;

    db.query(summaryQuery, (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error fetching summary'
        });
      }

      const summary = {
        total: results.length,
        upcoming: results.filter(e => e.status?.toLowerCase() === 'upcoming').length,
        in_progress: results.filter(e => e.status?.toLowerCase() === 'in_progress').length,
        completed: results.filter(e => e.status?.toLowerCase() === 'completed').length,
        cancelled: results.filter(e => e.status?.toLowerCase() === 'cancelled').length
      };

      res.json({
        success: true,
        data: summary
      });
    });
  });
});

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, date, search, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const updateQuery = `
    UPDATE events
    SET status = CASE
      WHEN status != 'cancelled' THEN
        CASE
          WHEN CURDATE() < DATE(start_date) THEN 'upcoming'
          WHEN CURDATE() >= DATE(start_date) AND CURDATE() <= DATE(end_date) THEN 'in_progress'
          ELSE 'completed'
        END
      ELSE status
    END
  `;

  db.query(updateQuery, (updateErr) => {
    if (updateErr) {
      console.error('Error auto-updating event status:', updateErr);
    }

    let query = `
      SELECT
        e.*,
        p.promo_code,
        p.promo_name,
        GROUP_CONCAT(DISTINCT CONCAT(a.asset_id, ' (', ea.quantity, ')') SEPARATOR ', ') as assets
      FROM events e
      LEFT JOIN promotions p ON e.promo_id = p.promo_id
      LEFT JOIN event_assets ea ON e.event_id = ea.event_id
      LEFT JOIN assets a ON ea.asset_id = a.asset_id
    `;

    let countQuery = `
      SELECT COUNT(DISTINCT e.event_id) as total
      FROM events e
    `;

    const params = [];
    const countParams = [];
    const conditions = [];

    if (status) {
      conditions.push('e.status = ?');
      params.push(status);
      countParams.push(status);
    }

    if (date) {
      conditions.push('DATE(e.start_date) = ?');
      params.push(date);
      countParams.push(date);
    }

    if (search) {
      conditions.push('(e.event_name LIKE ? OR e.customer LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY e.event_id ORDER BY e.created_at DESC';
    query += ` LIMIT ${limitNum} OFFSET ${offset}`;

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error counting events'
        });
      }

      const total = countResult[0].total;

      db.query(query, params, (err, results) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error fetching events'
          });
        }

        const formattedResults = results.map(event => {
          return {
            ...event,
            start_date_formatted: formatDate(event.start_date),
            end_date_formatted: formatDate(event.end_date)
          };
        });

        res.json({
          success: true,
          data: formattedResults,
          total: total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        });
      });
    });
  });
});

router.get('/calendar', (req, res) => {
  const db = req.app.locals.db;
  const { status } = req.query;

  let query = `
    SELECT
      event_id,
      event_name,
      start_date,
      end_date,
      location,
      customer,
      package_name,
      status
    FROM events
    WHERE status != 'cancelled'
  `;

  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY start_date ASC';

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching calendar events'
      });
    }

    const events = results.map(event => {
      if (event.status?.toLowerCase() !== 'cancelled') {
        event.status = determineStatus(event.start_date, event.end_date);
      }
      return {
        ...event,
        start_date: new Date(event.start_date).toISOString().split('T')[0],
        end_date: new Date(event.end_date).toISOString().split('T')[0]
      };
    });

    res.json({
      success: true,
      data: events
    });
  });
});

router.get('/:event_id', (req, res) => {
  const db = req.app.locals.db;
  const { event_id } = req.params;

  const eventQuery = `
    SELECT e.*, 
           p.promo_code, p.promo_name,
           ib.item_name as backdrop_name, ib.stock_quantity as backdrop_stock,
           ip.item_name as print_name, ip.stock_quantity as print_stock
    FROM events e 
    LEFT JOIN promotions p ON e.promo_id = p.promo_id
    LEFT JOIN inventory ib ON e.backdrop_item_id = ib.item_id
    LEFT JOIN inventory ip ON e.print_item_id = ip.item_id
    WHERE e.event_id = ?
  `;

  db.query(eventQuery, [event_id], (err, eventResults) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching event'
      });
    }

    if (eventResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = eventResults[0];

    if (event.backdrop_item_id === -1) {
      event.backdrop_name = 'Custom Backdrop';
      event.backdrop_stock = 0;
    }

    if (event.status?.toLowerCase() !== 'cancelled') {
      event.status = determineStatus(event.start_date, event.end_date);
    }

    event.start_date_formatted = formatDate(event.start_date);
    event.end_date_formatted = formatDate(event.end_date);

    if (event.start_date) {
      const startDate = new Date(event.start_date);
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      event.start_date = `${year}-${month}-${day}`;
    }
    if (event.end_date) {
      const endDate = new Date(event.end_date);
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      event.end_date = `${year}-${month}-${day}`;
    }

    const assetsQuery = `
      SELECT a.asset_id, a.name as asset_name, a.status as asset_status, ea.quantity
      FROM event_assets ea
      LEFT JOIN assets a ON ea.asset_id = a.asset_id
      WHERE ea.event_id = ?
    `;

    db.query(assetsQuery, [event_id], (err, assetsResults) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error fetching assets'
        });
      }

      const assetsWithAnnotation = assetsResults.map(asset => {
        if (asset.asset_status === 'Deleted') {
          return {
            ...asset,
            asset_name: `${asset.asset_name} - Item Deleted`
          };
        }
        return asset;
      });
      
      event.assets = assetsWithAnnotation;

      res.json({
        success: true,
        data: event
      });
    });
  });
});

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    event_name,
    start_date,
    end_date,
    location,
    customer,
    customer_id,
    package_name,
    extra_hours,
    backdrop_item_id,
    backdrop_quantity,
    guestbook_album,
    gif_boomerang,
    print_item_id,
    print_quantity,
    expected_revenue,
    booth_setup,
    assets,
    created_by,
    promo_id,
    discount_amount
  } = req.body;

  const autoStatus = determineStatus(start_date, end_date);

  const assetIds = Array.isArray(assets)
    ? assets.map(asset => asset.asset_id).filter(Boolean)
    : [];

  const proceedCreate = () => {
    // Simplified version without transactions for presentation demo
    // Generate event_id string
    const generateEventId = () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      return `EVT-${timestamp}-${random}`;
    };
    const event_id = generateEventId();

    const inventoryUpdates = [];
    if (backdrop_item_id && backdrop_item_id !== -1 && backdrop_quantity > 0) {
      inventoryUpdates.push(new Promise((resolve, reject) => {
        db.query('UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE item_id = ?', [backdrop_quantity, backdrop_item_id], (err) => {
          if (err) reject(err); else resolve();
        });
      }));
    }
    if (print_item_id && print_quantity > 0) {
      inventoryUpdates.push(new Promise((resolve, reject) => {
        db.query('UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE item_id = ?', [print_quantity, print_item_id], (err) => {
          if (err) reject(err); else resolve();
        });
      }));
    }

    Promise.all(inventoryUpdates)
      .then(() => {
        const eventQuery = `
          INSERT INTO events (
            event_id, event_name, start_date, end_date, location, customer, customer_id, 
            package_name, extra_hours, backdrop_item_id, backdrop_quantity, 
            guestbook_album, gif_boomerang, print_item_id, print_quantity, 
            expected_revenue, status, booth_setup, created_by, promo_id, discount_amount
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(eventQuery, [
          event_id, event_name, start_date, end_date, location, customer, customer_id || null,
          package_name, extra_hours || 0, backdrop_item_id, backdrop_quantity || 0,
          guestbook_album || false, gif_boomerang || false, print_item_id, print_quantity || 0,
          expected_revenue || 0, autoStatus, booth_setup || null, created_by || 'N/A',
          promo_id || null, Number(discount_amount) || 0.00
        ], (err, result) => {
          if (err) {
            console.error('Error creating event:', err);
            return res.status(500).json({ success: false, message: 'Error creating event' });
          }

          console.log('Event created with ID:', event_id);

          if (customer_id && expected_revenue) {
            db.query('UPDATE customers SET total_spending = total_spending + ? WHERE customer_id = ?', [expected_revenue, customer_id]);
          }

          if (assets && assets.length > 0) {
            const assetPromises = assets.map(asset => {
              return new Promise((resolve, reject) => {
                db.query('SELECT location FROM assets WHERE asset_id = ?', [asset.asset_id], (err, locResults) => {
                  if (err) {
                    console.error('Error fetching asset location:', err);
                    return reject(err);
                  }
                  const originalLocation = locResults.length > 0 ? locResults[0].location : null;
                  console.log('Adding asset to event:', { event_id: event_id, asset_id: asset.asset_id, quantity: asset.quantity, original_location: originalLocation });
                  db.query('INSERT INTO event_assets (event_id, asset_id, quantity, original_location) VALUES (?, ?, ?, ?)', 
                    [event_id, asset.asset_id, asset.quantity, originalLocation], (err) => {
                      if (err) {
                        console.error('Error inserting event asset:', err);
                        reject(err);
                      } else {
                        resolve();
                      }
                    });
                });
              });
            });

            Promise.all(assetPromises)
              .then(() => {
                if (autoStatus === 'in_progress') {
                  updateAssetLocations(event_id, 'Off Site', db);
                  updateAssetStatusByEventStatus(event_id, 'in_progress', db);
                }
                res.json({ success: true, message: 'Event created successfully', event_id: event_id });
              })
              .catch(err => {
                console.error('Error adding assets:', err);
                res.status(500).json({ success: false, message: 'Asset error: ' + err.message });
              });
          } else {
            res.json({ success: true, message: 'Event created successfully', event_id: event_id });
          }
        });
      })
      .catch(err => {
        console.error('Error updating inventory:', err);
        res.status(500).json({ success: false, message: 'Inventory error' });
      });
  };

  if (assetIds.length > 0) {
    return getAssetConflicts(db, { start_date, end_date, asset_ids: assetIds }, (conflictErr, conflictList) => {
      if (conflictErr) {
        console.error('Error checking asset conflicts:', conflictErr);
        return res.status(500).json({ success: false, message: 'Error checking asset conflicts' });
      }

      if (conflictList.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Asset conflicts detected',
          conflicts: conflictList
        });
      }

      proceedCreate();
    });
  }

  return proceedCreate();
});

function insertAssets(event_id, assets, db, res, callback) {
  if (assets && assets.length > 0) {
    const assetPromises = assets.map(asset => {
      return new Promise((resolve, reject) => {
        if (asset.asset_id) {
          const getLocationQuery = 'SELECT location FROM assets WHERE asset_id = ?';
          db.query(getLocationQuery, [asset.asset_id], (err, locResults) => {
            if (err) {
              console.error('Error getting asset location:', err);
              reject(err);
            } else {
              const originalLocation = locResults.length > 0 ? locResults[0].location : null;
              const assetQuery = `
                INSERT INTO event_assets (event_id, asset_id, quantity, original_location)
                VALUES (?, ?, ?, ?)
              `;
              db.query(assetQuery, [event_id, asset.asset_id, asset.quantity, originalLocation], (err) => {
                if (err) {
                  console.error('Error inserting asset with asset_id:', err);
                  reject(err);
                }
                else resolve();
              });
            }
          });
        } else {
          const lookupQuery = 'SELECT asset_id, location FROM assets WHERE name = ?';
          db.query(lookupQuery, [asset.name], (err, results) => {
            if (err) {
              console.error('Error looking up asset_id:', err);
              reject(err);
            } else if (results.length === 0) {
              reject(new Error(`Asset "${asset.name}" not found in assets table`));
            } else {
              const asset_id = results[0].asset_id;
              const originalLocation = results[0].location;
              const assetQuery = `
                INSERT INTO event_assets (event_id, asset_id, quantity, original_location)
                VALUES (?, ?, ?, ?)
              `;
              db.query(assetQuery, [event_id, asset_id, asset.quantity, originalLocation], (err) => {
                if (err) {
                  console.error('Error inserting asset with looked up asset_id:', err);
                  reject(err);
                }
                else resolve();
              });
            }
          });
        }
      });
    });

    Promise.all(assetPromises)
      .then(() => {
        if (callback) callback();
        res.json({
          success: true,
          message: 'Event created successfully',
          event_id: event_id
        });
      })
      .catch((err) => {
        console.error('Error in insertAssets:', err);
        return res.status(500).json({
          success: false,
          message: 'Error inserting assets: ' + err.message
        });
      });
  } else {
    if (callback) callback();
    res.json({
      success: true,
      message: 'Event created successfully',
      event_id: event_id
    });
  }
}

function updateAssetLocations(event_id, newLocation, db) {
  const query = `
    UPDATE assets a
    JOIN event_assets ea ON a.asset_id = ea.asset_id
    SET a.location = ?
    WHERE ea.event_id = ?
  `;
  db.query(query, [newLocation, event_id], (err) => {
    if (err) {
      console.error('Error updating asset locations:', err);
    }
  });
}

function restoreAssetLocations(event_id, db) {
  const query = `
    UPDATE assets a
    JOIN event_assets ea ON a.asset_id = ea.asset_id
    SET a.location = ea.original_location
    WHERE ea.event_id = ?
  `;
  db.query(query, [event_id], (err) => {
    if (err) {
      console.error('Error restoring asset locations:', err);
    }
  });
}

router.put('/:event_id', (req, res) => {
  const db = req.app.locals.db;
  const { event_id } = req.params;
  const {
    event_name,
    start_date,
    end_date,
    location,
    customer_id,
    package_name,
    extra_hours,
    backdrop_item_id,
    backdrop_quantity,
    guestbook_album,
    gif_boomerang,
    print_item_id,
    print_quantity,
    expected_revenue,
    booth_setup,
    assets,
    promo_id,
    discount_amount
  } = req.body;

  const autoStatus = determineStatus(start_date, end_date);

  const assetIds = Array.isArray(assets)
    ? assets.map(asset => asset.asset_id).filter(Boolean)
    : [];

  const proceedUpdate = () => {
    // Simplified version without transactions for presentation demo
    db.query('SELECT * FROM events WHERE event_id = ?', [event_id], (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
      const oldEvent = results[0];

      const inventoryUpdates = [];
      if (oldEvent.backdrop_item_id && oldEvent.backdrop_item_id !== -1 && oldEvent.backdrop_quantity > 0) {
        inventoryUpdates.push(new Promise((resolve, reject) => {
          db.query('UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE item_id = ?', [oldEvent.backdrop_quantity, oldEvent.backdrop_item_id], (err) => {
            if (err) reject(err); else resolve();
          });
        }));
      }
      if (oldEvent.print_item_id && oldEvent.print_quantity > 0) {
        inventoryUpdates.push(new Promise((resolve, reject) => {
          db.query('UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE item_id = ?', [oldEvent.print_quantity, oldEvent.print_item_id], (err) => {
            if (err) reject(err); else resolve();
          });
        }));
      }
      if (backdrop_item_id && backdrop_item_id !== -1 && backdrop_quantity > 0) {
        inventoryUpdates.push(new Promise((resolve, reject) => {
          db.query('UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE item_id = ?', [backdrop_quantity, backdrop_item_id], (err) => {
            if (err) reject(err); else resolve();
          });
        }));
      }
      if (print_item_id && print_quantity > 0) {
        inventoryUpdates.push(new Promise((resolve, reject) => {
          db.query('UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE item_id = ?', [print_quantity, print_item_id], (err) => {
            if (err) reject(err); else resolve();
          });
        }));
      }

      Promise.all(inventoryUpdates)
        .then(() => {
          const updateQuery = `
            UPDATE events SET 
              event_name = ?, start_date = ?, end_date = ?, location = ?, status = ?,
              package_name = ?, extra_hours = ?, backdrop_item_id = ?, backdrop_quantity = ?,
              guestbook_album = ?, gif_boomerang = ?, print_item_id = ?, print_quantity = ?,
              expected_revenue = ?, booth_setup = ?, promo_id = ?, discount_amount = ?
            WHERE event_id = ?
          `;

          db.query(updateQuery, [
            event_name, start_date, end_date, location, autoStatus,
            package_name, extra_hours, backdrop_item_id, backdrop_quantity,
            guestbook_album, gif_boomerang, print_item_id, print_quantity,
            expected_revenue, booth_setup || null, promo_id || null, Number(discount_amount) || 0.00, event_id
          ], (err) => {
            if (err) {
              console.error('Error updating event:', err);
              return res.status(500).json({ success: false, message: 'Update error' });
            }

            const revDiff = expected_revenue - oldEvent.expected_revenue;
            if (customer_id && revDiff !== 0) {
              db.query('UPDATE customers SET total_spending = total_spending + ? WHERE customer_id = ?', [revDiff, customer_id]);
            }

            db.query('DELETE FROM event_assets WHERE event_id = ?', [event_id], (err) => {
              if (assets && assets.length > 0) {
                const assetPromises = assets.map(asset => {
                  return new Promise((resolve, reject) => {
                    db.query('SELECT location FROM assets WHERE asset_id = ?', [asset.asset_id], (err, locResults) => {
                      const originalLocation = locResults.length > 0 ? locResults[0].location : null;
                      db.query('INSERT INTO event_assets (event_id, asset_id, quantity, original_location) VALUES (?, ?, ?, ?)', 
                        [event_id, asset.asset_id, asset.quantity, originalLocation], (err) => {
                        if (err) reject(err); else resolve();
                      });
                    });
                  });
                });

                Promise.all(assetPromises)
                  .then(() => {
                    if (autoStatus === 'in_progress') {
                      updateAssetLocations(event_id, 'Off Site', db);
                      updateAssetStatusByEventStatus(event_id, 'in_progress', db);
                    } else if (autoStatus === 'completed') {
                      restoreAssetLocations(event_id, db);
                      updateAssetStatusByEventStatus(event_id, 'completed', db);
                    }
                    res.json({ success: true, message: 'Event updated successfully' });
                  })
                  .catch(err => {
                    console.error('Error adding assets:', err);
                    res.status(500).json({ success: false, message: 'Asset error' });
                  });
              } else {
                res.json({ success: true, message: 'Event updated successfully' });
              }
            });
          });
        })
        .catch(err => {
          console.error('Error updating inventory:', err);
          res.status(500).json({ success: false, message: 'Inventory error' });
        });
    });
  };

  if (assetIds.length > 0) {
    return getAssetConflicts(db, { start_date, end_date, asset_ids: assetIds, exclude_event_id: event_id }, (conflictErr, conflictList) => {
      if (conflictErr) {
        console.error('Error checking asset conflicts:', conflictErr);
        return res.status(500).json({ success: false, message: 'Error checking asset conflicts' });
      }

      if (conflictList.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Asset conflicts detected',
          conflicts: conflictList
        });
      }

      proceedUpdate();
    });
  }

  return proceedUpdate();
});

router.delete('/:event_id', (req, res) => {
  const db = req.app.locals.db;
  const { event_id } = req.params;
  const { delete_reason, is_completed } = req.body;

  console.log('DELETE event request:', { event_id, delete_reason, is_completed });

  db.query('SELECT * FROM events WHERE event_id = ?', [event_id], (err, results) => {
    if (err) {
      console.error('Error fetching event:', err);
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    if (results.length === 0) {
      console.error('Event not found:', event_id);
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const event = results[0];
    console.log('Event found:', event);

    db.getConnection((err, connection) => {
      if (err) {
        console.error('Connection error:', err);
        return res.status(500).json({ success: false, message: 'Connection error' });
      }

      connection.beginTransaction(err => {
        if (err) {
          console.error('Transaction error:', err);
          connection.release();
          return res.status(500).json({ success: false, message: 'Transaction error' });
        }

        if (event.backdrop_item_id && event.backdrop_item_id !== -1 && event.backdrop_quantity > 0) {
          connection.query('UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE item_id = ?', [event.backdrop_quantity, event.backdrop_item_id]);
        }
        if (event.print_item_id && event.print_quantity > 0) {
          connection.query('UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE item_id = ?', [event.print_quantity, event.print_item_id]);
        }

        if (event.customer_id && event.status !== 'cancelled' && event.expected_revenue) {
          connection.query('UPDATE customers SET total_spending = total_spending - ? WHERE customer_id = ?', [event.expected_revenue, event.customer_id]);
        }

        if (is_completed) {
          const updateQuery = `
            UPDATE events
            SET status = 'cancelled',
                is_deleted = TRUE,
                deleted_reason = ?,
                deleted_by = ?,
                deleted_at = CURRENT_TIMESTAMP
            WHERE event_id = ?
          `;
          connection.query(updateQuery, [delete_reason, req.body.deleted_by || 'Unknown', event_id], (err) => {
            if (err) {
              console.error('Delete error:', err);
              connection.rollback(() => connection.release());
              return res.status(500).json({ success: false, message: 'Delete error' });
            }
            updateAssetStatusByEventStatus(event_id, 'cancelled', connection);
            connection.commit(err => {
              if (err) {
                console.error('Commit error:', err);
                connection.rollback(() => connection.release());
                return res.status(500).json({ success: false, message: 'Commit error' });
              }
              connection.release();
              console.log('Event deleted successfully');
              res.json({ success: true, message: 'Event deleted successfully' });
            });
          });
        } else {
          connection.query("UPDATE events SET status = 'cancelled' WHERE event_id = ?", [event_id], (err) => {
            if (err) {
              console.error('Cancel error:', err);
              connection.rollback(() => connection.release());
              return res.status(500).json({ success: false, message: 'Cancel error' });
            }
            updateAssetStatusByEventStatus(event_id, 'cancelled', connection);
            connection.commit(err => {
              if (err) {
                console.error('Commit error:', err);
                connection.rollback(() => connection.release());
                return res.status(500).json({ success: false, message: 'Commit error' });
              }
              connection.release();
              console.log('Event cancelled successfully');
              res.json({ success: true, message: 'Event cancelled successfully' });
            });
          });
        }
      });
    });
  });
});

router.delete('/:event_id/hard-delete', (req, res) => {
  const db = req.app.locals.db;
  const { event_id } = req.params;

  db.query('DELETE FROM event_assets WHERE event_id = ?', [event_id], (err) => {
    if (err) {
      console.error('Error deleting event assets:', err);
      return res.status(500).json({
        success: false,
        message: 'Error deleting event assets'
      });
    }

    const deleteEventQuery = 'DELETE FROM events WHERE event_id = ?';
    db.query(deleteEventQuery, [event_id], (err, result) => {
      if (err) {
        console.error('Error deleting event:', err);
        return res.status(500).json({
          success: false,
          message: 'Error deleting event'
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        message: 'Event permanently deleted'
      });
    });
  });
});

module.exports = router;
