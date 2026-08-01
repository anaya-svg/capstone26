const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../inventory_attachments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'inventory-' + uniqueSuffix + path.extname(file.originalname));
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
  const { search, status, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT 
      i.item_id,
      i.display_id,
      i.item_name, 
      c.category_name, 
      i.stock_quantity, 
      i.minimum_stock, 
      u.uom_name, 
      i.vendor, 
      i.stock_status, 
      i.status,
      i.last_update, 
      i.created_at,
      i.category_id,
      i.uom_id,
      i.attachment,
      (
        SELECT pr.supplier
        FROM procurement_request_items pri
        JOIN procurement_requests pr ON pr.pr_id = pri.pr_id
        WHERE pri.item_id = i.item_id
          AND pri.item_classification = 'Supplies'
          AND pr.status = 'Received'
          AND COALESCE(pr.deleted_from_received, 0) = 0
        ORDER BY pr.created_at DESC, pr.pr_id DESC
        LIMIT 1
      ) AS last_procurement_vendor,
      (
        SELECT pr.pr_id
        FROM procurement_request_items pri
        JOIN procurement_requests pr ON pr.pr_id = pri.pr_id
        WHERE pri.item_id = i.item_id
          AND pri.item_classification = 'Supplies'
          AND pr.status = 'Received'
          AND COALESCE(pr.deleted_from_received, 0) = 0
        ORDER BY pr.created_at DESC, pr.pr_id DESC
        LIMIT 1
      ) AS last_procurement_gr_id
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.category_id
    LEFT JOIN uom u ON i.uom_id = u.uom_id
    WHERE 1=1
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM inventory i
    WHERE 1=1
  `;
  const params = [];
  const countParams = [];

  if (status) {
    query += ' AND i.status = ?';
    countQuery += ' AND i.status = ?';
    params.push(status);
    countParams.push(status);
  }

  if (req.query.stock_status) {
    if (req.query.stock_status === 'low_or_out_of_stock') {
      query += ' AND (i.stock_status = ? OR i.stock_status = ?)';
      countQuery += ' AND (i.stock_status = ? OR i.stock_status = ?)';
      params.push('low_stock', 'out_of_stock');
      countParams.push('low_stock', 'out_of_stock');
    } else {
      query += ' AND i.stock_status = ?';
      countQuery += ' AND i.stock_status = ?';
      params.push(req.query.stock_status);
      countParams.push(req.query.stock_status);
    }
  }

  if (search) {
    query += ' AND i.item_name LIKE ?';
    countQuery += ' AND i.item_name LIKE ?';
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  query += ' ORDER BY i.created_at DESC';
  query += ` LIMIT ${limitNum} OFFSET ${offset}`;

  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error('Error counting inventory:', err);
      return res.status(500).json({
        success: false,
        message: 'Error counting inventory'
      });
    }

    const total = countResult[0].total;

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching inventory:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching inventory'
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
  const { status } = req.query;

  let query = `
    SELECT 
      i.display_id,
      i.item_name, 
      c.category_name, 
      i.stock_quantity, 
      i.minimum_stock, 
      u.uom_name, 
      i.vendor, 
      i.stock_status, 
      i.status,
      i.last_update, 
      i.created_at,
      i.attachment,
      (
        SELECT pr.supplier
        FROM procurement_request_items pri
        JOIN procurement_requests pr ON pr.pr_id = pri.pr_id
        WHERE pri.item_id = i.item_id
          AND pri.item_classification = 'Supplies'
          AND pr.status = 'Received'
          AND COALESCE(pr.deleted_from_received, 0) = 0
        ORDER BY pr.created_at DESC, pr.pr_id DESC
        LIMIT 1
      ) AS last_procurement_vendor
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.category_id
    LEFT JOIN uom u ON i.uom_id = u.uom_id
    WHERE 1=1
  `;
  const params = [];

  if (stock_status) {
    const statuses = stock_status.split(',').filter((s) => s && s.trim() !== '');
    if (statuses.length === 1 && statuses[0] === 'low_or_out_of_stock') {
      query += ' AND (i.stock_status = ? OR i.stock_status = ?)';
      params.push('low_stock', 'out_of_stock');
    } else if (statuses.length > 0) {
      query += ` AND i.stock_status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
  }

  if (search) {
    query += ' AND i.item_name LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY i.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error exporting inventory:', err);
      return res.status(500).json({
        success: false,
        message: 'Error exporting inventory'
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

  const query = `
    SELECT
      COUNT(*) as total_items,
      SUM(CASE WHEN (stock_status = 'low_stock' OR stock_status = 'out_of_stock') AND status = 'active' THEN 1 ELSE 0 END) as low_stock_items,
      SUM(CASE WHEN stock_status = 'in_stock' AND status = 'active' THEN 1 ELSE 0 END) as in_stock_items,
      SUM(CASE WHEN status = 'drafted' THEN 1 ELSE 0 END) as drafted_items
    FROM inventory
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching inventory summary:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching inventory summary'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

router.get('/low-stock', (req, res) => {
  const db = req.app.locals.db;
  const { status } = req.query;

  let query = `
    SELECT 
      i.item_id,
      i.display_id,
      i.item_name, 
      c.category_name, 
      i.stock_quantity, 
      i.minimum_stock, 
      u.uom_name
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.category_id
    LEFT JOIN uom u ON i.uom_id = u.uom_id
    WHERE i.stock_quantity <= i.minimum_stock
      AND i.status = 'active'
      AND (i.stock_status = 'low_stock' OR i.stock_status = 'out_of_stock')
    ORDER BY (i.minimum_stock - i.stock_quantity) DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching low stock items:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching low stock items'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

router.put('/recalculate-stock-status', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    UPDATE inventory 
    SET stock_status = CASE 
      WHEN stock_quantity = 0 THEN 'out_of_stock'
      WHEN stock_quantity <= minimum_stock THEN 'low_stock'
      ELSE 'in_stock'
    END
    WHERE status = 'active'
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error recalculating stock status:', err);
      return res.status(500).json({
        success: false,
        message: 'Error recalculating stock status'
      });
    }

    res.json({
      success: true,
      message: `Stock status recalculated for ${result.affectedRows} items`
    });
  });
});

router.put('/recalculate-stock-status', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    UPDATE inventory 
    SET stock_status = CASE 
      WHEN stock_quantity = 0 THEN 'out_of_stock'
      WHEN stock_quantity <= minimum_stock THEN 'low_stock'
      ELSE 'in_stock'
    END
    WHERE status = 'active'
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error recalculating stock status:', err);
      return res.status(500).json({
        success: false,
        message: 'Error recalculating stock status'
      });
    }

    res.json({
      success: true,
      message: `Stock status recalculated for ${result.affectedRows} items`
    });
  });
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const itemId = req.params.id;

  const query = `
    SELECT 
      i.item_id,
      i.display_id,
      i.item_name, 
      c.category_name, 
      i.stock_quantity, 
      i.minimum_stock, 
      u.uom_name, 
      i.vendor, 
      i.stock_status,
      i.status,
      i.last_update, 
      i.created_at,
      i.category_id,
      i.uom_id,
      i.attachment
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.category_id
    LEFT JOIN uom u ON i.uom_id = u.uom_id
    WHERE i.item_id = ?
  `;

  db.query(query, [itemId], (err, results) => {
    if (err) {
      console.error('Error fetching inventory item:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching inventory item'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

router.post('/', upload.single('attachment'), (req, res) => {
  const db = req.app.locals.db;
  const { item_name, category_id, stock_quantity, minimum_stock, uom_id, vendor, status } = req.body;
  const itemStatus = status || 'active';
  const attachment = req.file ? 'inventory_attachments/' + req.file.filename : null;

  const checkDuplicateQuery = `SELECT item_id FROM inventory WHERE LOWER(item_name) = LOWER(?) AND status = 'active'`;
  db.query(checkDuplicateQuery, [item_name], (err, duplicateResult) => {
    if (err) {
      console.error('Error checking duplicate item name:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking duplicate item name'
      });
    }

    if (duplicateResult.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Item name already exists'
      });
    }

    const stockQty = Number(stock_quantity);
    const minStock = Number(minimum_stock);
    let stock_status = 'in_stock';
    if (stockQty === 0) {
      stock_status = 'out_of_stock';
    } else if (stockQty <= minStock) {
      stock_status = 'low_stock';
    } else {
      stock_status = 'in_stock';
    }

    db.query(`SHOW COLUMNS FROM inventory LIKE 'attachment'`, (err, result) => {
      if (err) {
        console.error('Error checking attachment column:', err);
      }
      
      const hasAttachmentColumn = result && result.length > 0;
      
      let query, params;
      
      if (hasAttachmentColumn) {
        query = `
          INSERT INTO inventory (item_name, category_id, stock_quantity, minimum_stock, uom_id, vendor, stock_status, attachment, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        params = [item_name, category_id, stock_quantity, minimum_stock, uom_id, vendor, stock_status, attachment, itemStatus];
      } else {
        query = `
          INSERT INTO inventory (item_name, category_id, stock_quantity, minimum_stock, uom_id, vendor, stock_status, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        params = [item_name, category_id, stock_quantity, minimum_stock, uom_id, vendor, stock_status, itemStatus];
      }

      db.query(query, params, (err, result) => {
        if (err) {
          console.error('Error creating inventory item:', err);
          return res.status(500).json({
            success: false,
            message: 'Error creating inventory item: ' + err.message
          });
        }

        // Generate display_id based on item_id
        const displayId = `INV-${String(result.insertId).padStart(3, '0')}`;
        
        // Update display_id in database
        db.query('UPDATE inventory SET display_id = ? WHERE item_id = ?', [displayId, result.insertId], (updateErr) => {
          if (updateErr) {
            console.error('Error updating display_id:', updateErr);
          }
        });

        res.json({
          success: true,
          message: 'Inventory item created successfully',
          data: {
            item_id: result.insertId,
            display_id: displayId,
            item_name,
            category_id,
            stock_quantity,
            minimum_stock,
            uom_id,
            vendor,
            stock_status,
            attachment: hasAttachmentColumn ? attachment : null
          }
        });
      });
    });
  });
});

router.put('/:id', upload.single('attachment'), (req, res) => {
  const db = req.app.locals.db;
  const itemId = req.params.id;
  const { item_name, category_id, stock_quantity, minimum_stock, uom_id, vendor } = req.body;

  const stockQty = Number(stock_quantity);
  const minStock = Number(minimum_stock);

  const checkDuplicateQuery = `SELECT item_id FROM inventory WHERE LOWER(item_name) = LOWER(?) AND item_id != ? AND status = 'active'`;
  db.query(checkDuplicateQuery, [item_name, itemId], (err, duplicateResult) => {
    if (err) {
      console.error('Error checking duplicate item name:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking duplicate item name'
      });
    }

    if (duplicateResult.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Item name already exists'
      });
    }

    db.query('SELECT attachment FROM inventory WHERE item_id = ?', [itemId], (err, results) => {
      if (err) {
        console.error('Error fetching existing item:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching existing item'
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      const existingAttachment = results[0].attachment;
      const attachment = req.file ? 'inventory_attachments/' + req.file.filename : existingAttachment;

      let stock_status = 'in_stock';
      
      if (stockQty === 0) {
        stock_status = 'out_of_stock';
      } else if (stockQty <= minStock) {
        stock_status = 'low_stock';
      } else {
        stock_status = 'in_stock';
      }

      const query = `
        UPDATE inventory
        SET item_name = ?, category_id = ?, stock_quantity = ?, minimum_stock = ?, uom_id = ?, vendor = ?, stock_status = ?, attachment = ?
        WHERE item_id = ?
      `;

      db.query(query, [item_name, category_id, stockQty, minStock, uom_id, vendor, stock_status, attachment, itemId], (err, result) => {
        if (err) {
          console.error('Error updating inventory item:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating inventory item'
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Inventory item not found'
          });
        }

        res.json({
          success: true,
          message: 'Inventory item updated successfully'
        });
      });
    });
  });
});

router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const itemId = req.params.id;

  const query = `DELETE FROM inventory WHERE item_id = ?`;

  db.query(query, [itemId], (err, result) => {
    if (err) {
      console.error('Error deleting inventory item:', err);
      return res.status(500).json({
        success: false,
        message: 'Error deleting inventory item'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  });
});

router.put('/:id/draft', (req, res) => {
  const db = req.app.locals.db;
  const itemId = req.params.id;

  const query = `UPDATE inventory SET status = 'drafted' WHERE item_id = ?`;

  db.query(query, [itemId], (err, result) => {
    if (err) {
      console.error('Error drafting inventory item:', err);
      return res.status(500).json({
        success: false,
        message: 'Error drafting inventory item'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item drafted successfully'
    });
  });
});

module.exports = router;
