const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../pr_attachment');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'procurement-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const STATUS_REQUIRES_VALID_QUOTATION = new Set(['Waiting Approval', 'Approved', 'Received']);

function validateItemsForSubmission(items) {
  if (!Array.isArray(items)) {
    return {
      isValid: false,
      message: 'Invalid items format'
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i] || {};
    const quantity = Number(item.quantity);
    const cost = Number(item.cost);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        isValid: false,
        message: `Invalid quantity for item #${i + 1}. Quantity must be greater than 0.`
      };
    }

    if (!Number.isFinite(cost) || cost <= 0) {
      return {
        isValid: false,
        message: `Item #${i + 1} has no valid quotation yet. Please fill cost per item greater than 0 before submitting.`
      };
    }
  }

  return { isValid: true };
}

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
  const { status, date, search, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT pr.*, GROUP_CONCAT(
      CONCAT(
        pri.item_classification, '|',
        COALESCE(pri.item_name, a.name, ''), '|',
        COALESCE(pri.asset_id, ''), '|',
        pri.quantity, '|',
        pri.cost, '|',
        pri.additional_charge, '|',
        pri.additional_cost, '|',
        pri.total_cost, '|',
        COALESCE(a.status, '')
      ) SEPARATOR ';'
    ) as items
    FROM procurement_requests pr
    LEFT JOIN procurement_request_items pri ON pr.pr_id = pri.pr_id
    LEFT JOIN assets a ON pri.asset_id = a.asset_id
  `;
  let countQuery = `
    SELECT COUNT(DISTINCT pr.pr_id) as total
    FROM procurement_requests pr
    LEFT JOIN procurement_request_items pri ON pr.pr_id = pri.pr_id
    LEFT JOIN assets a ON pri.asset_id = a.asset_id
  `;
  const params = [];
  const countParams = [];
  const conditions = [];

  if (status) {
    if (status === 'Rejected') {
      // Filter for Rejected PR, Rejected PO, and Deleted GR
      conditions.push('(pr.status = ? OR (pr.status = ? AND pr.rejected_from_waiting = TRUE) OR (pr.status = ? AND pr.deleted_from_received = TRUE))');
      params.push('Rejected', 'Draft', 'Rejected');
      countParams.push('Rejected', 'Draft', 'Rejected');
    } else if (status === 'Draft') {
      // Filter for Draft only (exclude rejected drafts)
      conditions.push('(pr.status = ? AND pr.rejected_from_waiting IS NULL)');
      params.push('Draft');
      countParams.push('Draft');
    } else {
      conditions.push('pr.status = ?');
      params.push(status);
      countParams.push(status);
    }
  }

  if (date) {
    conditions.push('DATE(pr.created_at) = ?');
    params.push(date);
    countParams.push(date);
  }

  if (search) {
    conditions.push('(pr.pr_id LIKE ? OR pri.item_name LIKE ? OR a.name LIKE ? OR pr.supplier LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
    countQuery += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' GROUP BY pr.pr_id ORDER BY pr.created_at DESC';
  query += ` LIMIT ${limitNum} OFFSET ${offset}`;

  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error counting procurement requests'
      });
    }

    const total = countResult[0].total;

    db.query(query, params, (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error fetching procurement requests'
        });
      }

      const parsedResults = results.map(request => {
        if (request.items) {
          request.items = request.items.split(';').map(itemStr => {
            const [classification, name, assetId, quantity, cost, charge, addCost, totalCost, assetStatus] = itemStr.split('|');
            let itemName = name;
            if (assetStatus === 'Deleted') {
              itemName = `${name} - Item Deleted`;
            }
            return {
              item_classification: classification,
              item_name: itemName,
              asset_id: assetId,
              quantity: parseInt(quantity),
              cost: parseFloat(cost),
              additional_charge: charge,
              additional_cost: addCost ? parseFloat(addCost) : null,
              total_cost: parseFloat(totalCost)
            };
          });
        } else {
          request.items = [];
        }
        return request;
      });

      res.json({
        success: true,
        data: parsedResults,
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
  const { status, createdAt, search } = req.query;

  let query = `
    SELECT pr.*, GROUP_CONCAT(
      CONCAT(
        pri.item_classification, '|',
        COALESCE(pri.item_name, a.name, ''), '|',
        COALESCE(pri.asset_id, ''), '|',
        pri.quantity, '|',
        pri.cost, '|',
        pri.additional_charge, '|',
        pri.additional_cost, '|',
        pri.total_cost, '|',
        COALESCE(a.status, '')
      ) SEPARATOR ';'
    ) as items
    FROM procurement_requests pr
    LEFT JOIN procurement_request_items pri ON pr.pr_id = pri.pr_id
    LEFT JOIN assets a ON pri.asset_id = a.asset_id
    WHERE 1=1
  `;
  let countQuery = `
    SELECT COUNT(DISTINCT pr.pr_id) as total
    FROM procurement_requests pr
    LEFT JOIN procurement_request_items pri ON pr.pr_id = pri.pr_id
    LEFT JOIN assets a ON pri.asset_id = a.asset_id
    WHERE 1=1
  `;
  const params = [];
  const countParams = [];

  const appendInFilter = (column, valueParam, values) => {
    const list = values.filter((v) => v && v.trim() !== '');
    if (list.length === 0) return;
    const placeholders = list.map(() => '?').join(',');
    const condition = ` AND ${column} IN (${placeholders})`;
    query += condition;
    countQuery += condition;
    params.push(...list);
    countParams.push(...list);
  };

  if (status) {
    const statusList = status.split(',');
    if (statusList.includes('Rejected')) {
      // Handle Rejected filter to include Rejected PR, Rejected PO, and Deleted GR
      const otherStatuses = statusList.filter(s => s !== 'Rejected');
      if (otherStatuses.length > 0) {
        appendInFilter('pr.status', otherStatuses.join(','));
      }
      // Add special condition for Rejected
      const condition = ' AND (pr.status = ? OR (pr.status = ? AND pr.rejected_from_waiting = TRUE) OR (pr.status = ? AND pr.deleted_from_received = TRUE))';
      query += condition;
      countQuery += condition;
      params.push('Rejected', 'Draft', 'Rejected');
      countParams.push('Rejected', 'Draft', 'Rejected');
    } else if (statusList.includes('Draft')) {
      // Handle Draft filter to exclude rejected drafts
      const otherStatuses = statusList.filter(s => s !== 'Draft');
      if (otherStatuses.length > 0) {
        appendInFilter('pr.status', otherStatuses.join(','));
      }
      // Add special condition for Draft
      const condition = ' AND (pr.status = ? AND pr.rejected_from_waiting IS NULL)';
      query += condition;
      countQuery += condition;
      params.push('Draft');
      countParams.push('Draft');
    } else {
      appendInFilter('pr.status', status);
    }
  }

  if (createdAt) {
    const condition = ' AND DATE(pr.created_at) = ?';
    query += condition;
    countQuery += condition;
    params.push(createdAt);
    countParams.push(createdAt);
  }

  if (search) {
    const condition = ' AND (pr.pr_id LIKE ? OR pr.supplier LIKE ? OR pr.requested_by LIKE ?)';
    query += condition;
    countQuery += condition;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' GROUP BY pr.pr_id ORDER BY pr.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error exporting procurement requests:', err);
      return res.status(500).json({
        success: false,
        message: 'Error exporting procurement requests'
      });
    }

    const parsedResults = results.map((request) => {
      if (request.items) {
        request.items = request.items.split(';').map((itemStr) => {
          const [classification, name, assetId, quantity, cost, charge, addCost, totalCost, assetStatus] = itemStr.split('|');
          let itemName = name;
          if (assetStatus === 'Deleted') {
            itemName = `${name} - Item Deleted`;
          }
          return {
            classification,
            item_name: itemName,
            asset_id: assetId,
            quantity,
            cost,
            additional_charge: charge,
            additional_cost: addCost,
            total_cost: totalCost,
            asset_status: assetStatus
          };
        });
      } else {
        request.items = [];
      }
      return request;
    });

    res.json({
      success: true,
      data: parsedResults
    });
  });
});

router.get('/summary', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT
      COUNT(CASE WHEN status = 'Draft' AND rejected_from_waiting IS NULL THEN 1 END) as draft,
      COUNT(CASE WHEN status = 'Waiting Approval' THEN 1 END) as waiting_approval,
      COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'Rejected' OR (status = 'Draft' AND rejected_from_waiting = TRUE) OR (status = 'Rejected' AND deleted_from_received = TRUE) THEN 1 END) as rejected,
      COUNT(CASE WHEN status = 'Received' THEN 1 END) as received
    FROM procurement_requests
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching procurement summary'
      });
    }
    res.json({
      success: true,
      data: results[0]
    });
  });
});

router.post('/auto-draft-from-inventory/:item_id', (req, res) => {
  const db = req.app.locals.db;
  const { item_id } = req.params;
  const { requested_by, suggested_quantity } = req.body || {};

  // Use logged-in user's name if requested_by is not provided
  const finalRequestedBy = requested_by || req.user?.name || 'System Auto Draft';

  if (!item_id) {
    return res.status(400).json({
      success: false,
      message: 'Item ID is required'
    });
  }

  const getInventoryItemQuery = `
    SELECT
      i.item_id,
      i.item_name,
      i.stock_quantity,
      i.minimum_stock,
      i.vendor,
      (
        SELECT pri.cost
        FROM procurement_request_items pri
        JOIN procurement_requests pr ON pr.pr_id = pri.pr_id
        WHERE pri.item_id = i.item_id
          AND pri.item_classification = 'Supplies'
          AND pr.status = 'Received'
          AND COALESCE(pr.deleted_from_received, 0) = 0
        ORDER BY pr.created_at DESC, pr.pr_id DESC
        LIMIT 1
      ) AS last_unit_cost
    FROM inventory i
    WHERE i.item_id = ?
      AND i.status = 'active'
    LIMIT 1
  `;

  db.query(getInventoryItemQuery, [item_id], (err, itemResults) => {
    if (err) {
      console.error('Error fetching inventory item for auto draft:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching inventory item data'
      });
    }

    if (!itemResults || itemResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found or inactive'
      });
    }

    const item = itemResults[0];
    // Allow auto-draft even without vendor - user can set it later when converting draft to PR
    const supplier = (item.vendor || '').trim() || 'TBD';

    const requestedQuantity = Number(suggested_quantity);
    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required for auto draft. Please input real quantity manually.'
      });
    }

    const suggestedQuantity = Math.floor(requestedQuantity);
    const unitCost = 0;
    const totalCost = 0;

    const getLatestBaseIdQuery = 'SELECT base_id FROM procurement_requests ORDER BY base_id DESC LIMIT 1';

    db.query(getLatestBaseIdQuery, (baseIdErr, baseIdResults) => {
      if (baseIdErr) {
        console.error('Error generating base_id for auto draft:', baseIdErr);
        return res.status(500).json({
          success: false,
          message: 'Error generating draft procurement ID'
        });
      }

      const latestBaseId = baseIdResults.length > 0 ? Number(baseIdResults[0].base_id) : 0;

      const insertDraft = (baseId, retryCount = 0) => {
        if (retryCount > 50) {
          return res.status(500).json({
            success: false,
            message: 'Unable to generate unique procurement ID'
          });
        }

        const prId = `PR${baseId.toString().padStart(5, '0')}`;
        const insertRequestQuery = `
          INSERT INTO procurement_requests (
            pr_id, base_id, requested_by, supplier, marketplace_link,
            attachment, status, total_cost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertRequestQuery,
          [
            prId,
            baseId,
            finalRequestedBy,
            supplier,
            null,
            null,
            'Draft',
            totalCost
          ],
          (insertRequestErr) => {
            if (insertRequestErr) {
              if (insertRequestErr.code === 'ER_DUP_ENTRY') {
                return insertDraft(baseId + 1, retryCount + 1);
              }

              console.error('Error inserting auto draft procurement request:', insertRequestErr);
              return res.status(500).json({
                success: false,
                message: 'Error creating draft procurement request'
              });
            }

            const insertItemQuery = `
              INSERT INTO procurement_request_items (
                pr_id, item_classification, item_name, item_id, asset_id, quantity,
                cost, additional_charge, additional_cost, total_cost
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
              insertItemQuery,
              [
                prId,
                'Supplies',
                item.item_name,
                item.item_id,
                null,
                suggestedQuantity,
                unitCost,
                '',
                0,
                totalCost
              ],
              (insertItemErr) => {
                if (insertItemErr) {
                  console.error('Error inserting auto draft procurement item:', insertItemErr);
                  return res.status(500).json({
                    success: false,
                    message: 'Draft request created, but failed to insert draft item'
                  });
                }

                return res.json({
                  success: true,
                  message: 'Auto draft procurement request created successfully',
                  data: {
                    pr_id: prId,
                    supplier,
                    item_name: item.item_name,
                    suggested_quantity: suggestedQuantity,
                    estimated_unit_cost: unitCost,
                    estimated_total_cost: totalCost,
                    note: 'Quantity and cost in draft must be filled manually with real quotation data.'
                  }
                });
              }
            );
          }
        );
      };

      insertDraft(latestBaseId + 1);
    });
  });
});

router.get('/:pr_id', (req, res) => {
  const db = req.app.locals.db;
  const { pr_id } = req.params;

  const query = `
    SELECT pr.*, GROUP_CONCAT(
      CONCAT(
        pri.item_classification, '|',
        COALESCE(pri.item_name, a.name, ''), '|',
        COALESCE(pri.asset_id, ''), '|',
        pri.quantity, '|',
        pri.cost, '|',
        pri.additional_charge, '|',
        pri.additional_cost, '|',
        pri.total_cost, '|',
        COALESCE(a.status, '')
      ) SEPARATOR ';'
    ) as items
    FROM procurement_requests pr
    LEFT JOIN procurement_request_items pri ON pr.pr_id = pri.pr_id
    LEFT JOIN assets a ON pri.asset_id = a.asset_id
    WHERE pr.pr_id = ?
    GROUP BY pr.pr_id
  `;

  db.query(query, [pr_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching procurement request'
      });
    }
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Procurement request not found'
      });
    }

    const request = results[0];
    if (request.items) {
      request.items = request.items.split(';').map(itemStr => {
        const [classification, name, assetId, quantity, cost, charge, addCost, totalCost, assetStatus] = itemStr.split('|');
        let itemName = name;
        if (assetStatus === 'Deleted') {
          itemName = `${name} - Item Deleted`;
        }
        return {
          item_classification: classification,
          item_name: itemName,
          asset_id: assetId,
          quantity: parseInt(quantity),
          cost: parseFloat(cost),
          additional_charge: charge,
          additional_cost: addCost ? parseFloat(addCost) : null,
          total_cost: parseFloat(totalCost)
        };
      });
    } else {
      request.items = [];
    }

    res.json({
      success: true,
      data: request
    });
  });
});

router.post('/', upload.single('attachment'), (req, res) => {
  const db = req.app.locals.db;
  const {
    items,
    requested_by,
    supplier,
    marketplace_link,
    status
  } = req.body;

  // Use logged-in user's name if requested_by is not provided
  const finalRequestedBy = requested_by || req.user?.name || 'Unknown User';

  let parsedItems = items;
  if (typeof items === 'string') {
    try {
      parsedItems = JSON.parse(items);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items format'
      });
    }
  }

  const attachment = req.file ? `/uploads/${req.file.filename}` : null;

  if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Items array is required and must not be empty'
    });
  }

  const targetStatus = status || 'Waiting Approval';
  if (STATUS_REQUIRES_VALID_QUOTATION.has(targetStatus)) {
    const validation = validateItemsForSubmission(parsedItems);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }
  }

  let total_cost = 0;
  parsedItems.forEach(item => {
    const quantity = parseInt(item.quantity);
    const cost = parseFloat(item.cost);
    const additionalCost = item.additional_cost ? parseFloat(item.additional_cost) : 0;
    const itemTotal = (cost * quantity) + additionalCost;
    total_cost += itemTotal;
  });

  const query = 'SELECT base_id FROM procurement_requests ORDER BY base_id DESC LIMIT 1';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error generating PR ID'
      });
    }

    let base_id;
    if (results.length === 0) {
      base_id = 1;
    } else {
      base_id = results[0].base_id + 1;
    }

    insertPR(base_id);
  });

  function insertPR(base_id, retryCount = 0) {
    if (retryCount > 50) {
      return res.status(500).json({
        success: false,
        message: 'Unable to find unique PR ID after 50 attempts'
      });
    }

    let pr_id;
    if (status === 'Approved') {
      pr_id = 'PO' + base_id.toString().padStart(5, '0');
    } else if (status === 'Received') {
      pr_id = 'GR' + base_id.toString().padStart(5, '0');
    } else {
      pr_id = 'PR' + base_id.toString().padStart(5, '0');
    }

    const insertQuery = `
      INSERT INTO procurement_requests (
        pr_id, base_id, requested_by, supplier, marketplace_link,
        attachment, status, total_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [
      pr_id, base_id, finalRequestedBy, supplier, marketplace_link,
      attachment, status, total_cost
    ], (err, result) => {
      if (err) {
        console.error('SQL Error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          base_id++;
          insertPR(base_id, retryCount + 1);
          return;
        }
        return res.status(500).json({
          success: false,
          message: 'Error creating procurement request: ' + err.message
        });
      }

      insertItems(pr_id, parsedItems);
    });
  }

  function insertItems(pr_id, items) {
    const insertItemQuery = `
      INSERT INTO procurement_request_items (
        pr_id, item_classification, item_name, item_id, asset_id, quantity, cost,
        additional_charge, additional_cost, total_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let completedItems = 0;
    const totalItems = items.length;

    items.forEach(item => {
      const quantity = parseInt(item.quantity);
      const cost = parseFloat(item.cost);
      const additionalCost = item.additional_cost ? parseFloat(item.additional_cost) : 0;
      const itemTotal = (cost * quantity) + additionalCost;

      let itemId = null;
      let assetId = null;
      let itemName = item.item_name;

      if (item.item_classification === 'Assets') {
        if (item.item_name && item.item_name.startsWith('AST-')) {
          assetId = item.item_name;
        } else {
          const lookupQuery = 'SELECT asset_id FROM assets WHERE name = ?';
          db.query(lookupQuery, [item.item_name], (err, results) => {
            if (err) {
              console.error('Error looking up asset_id:', err);
            } else if (results.length > 0) {
              assetId = results[0].asset_id;
            }
            insertItem();
          });
          return;
        }
      } 
      else if (item.item_classification === 'Supplies') {
        const lookupQuery = 'SELECT item_id FROM inventory WHERE item_name = ? AND status = "active"';
        db.query(lookupQuery, [item.item_name], (err, results) => {
          if (err) {
            console.error('Error looking up item_id:', err);
          } else if (results.length > 0) {
            itemId = results[0].item_id;
          }
          insertItem();
        });
        return;
      }

      insertItem();

      function insertItem() {
        db.query(insertItemQuery, [
          pr_id, item.item_classification, itemName, itemId, assetId, quantity, cost,
          item.additional_charge, additionalCost, itemTotal
        ], (err) => {
          if (err) console.error('Error inserting item:', err);
          checkComplete();
        });
      }
    });

    function checkComplete() {
      completedItems++;
      if (completedItems === totalItems) {
        res.json({
          success: true,
          message: 'Procurement request created successfully',
          data: { pr_id }
        });
      }
    }

    if (totalItems === 0) {
      res.json({
        success: true,
        message: 'Procurement request created successfully',
        data: { pr_id }
      });
    }
  }
});

router.put('/:pr_id', upload.single('attachment'), (req, res) => {
  const db = req.app.locals.db;
  const { pr_id } = req.params;
  const {
    items,
    requested_by,
    supplier,
    marketplace_link,
    status
  } = req.body;

  // Use logged-in user's name if requested_by is not provided
  const finalRequestedBy = requested_by || req.user?.name || 'Unknown User';

  let parsedItems = items;
  if (typeof items === 'string') {
    try {
      parsedItems = JSON.parse(items);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items format'
      });
    }
  }

  let attachment = req.file ? `/uploads/${req.file.filename}` : null;
  if (!attachment && req.body.existing_attachment) {
    attachment = req.body.existing_attachment;
  }

  if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Items array is required and must not be empty'
    });
  }

  let total_cost = 0;
  parsedItems.forEach(item => {
    const quantity = parseInt(item.quantity);
    const cost = parseFloat(item.cost);
    const additionalCost = item.additional_cost ? parseFloat(item.additional_cost) : 0;
    const itemTotal = (cost * quantity) + additionalCost;
    total_cost += itemTotal;
  });

  const updateQuery = `
    UPDATE procurement_requests
    SET requested_by = ?, supplier = ?, marketplace_link = ?, attachment = ?, status = ?, total_cost = ?
    WHERE pr_id = ?
  `;

  db.query(updateQuery, [
    finalRequestedBy, supplier, marketplace_link, attachment, status || 'Waiting Approval', total_cost, pr_id
  ], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error updating procurement request'
      });
    }

    db.query('DELETE FROM procurement_request_items WHERE pr_id = ?', [pr_id], (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error deleting existing items'
        });
      }

      insertItems(pr_id, parsedItems);
    });
  });

  function insertItems(pr_id, items) {
    const insertItemQuery = `
      INSERT INTO procurement_request_items (
        pr_id, item_classification, item_name, item_id, asset_id, quantity, cost,
        additional_charge, additional_cost, total_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let completedItems = 0;
    const totalItems = items.length;

    items.forEach(item => {
      const quantity = parseInt(item.quantity);
      const cost = parseFloat(item.cost);
      const additionalCost = item.additional_cost ? parseFloat(item.additional_cost) : 0;
      const itemTotal = (cost * quantity) + additionalCost;

      let itemId = null;
      let assetId = null;
      let itemName = item.item_name;

      if (item.item_classification === 'Assets') {
        if (item.item_name && item.item_name.startsWith('AST-')) {
          assetId = item.item_name;
        } else {
          const lookupQuery = 'SELECT asset_id FROM assets WHERE name = ?';
          db.query(lookupQuery, [item.item_name], (err, results) => {
            if (err) {
              console.error('Error looking up asset_id:', err);
            } else if (results.length > 0) {
              assetId = results[0].asset_id;
            }
            insertItem();
          });
          return;
        }
      } 
      else if (item.item_classification === 'Supplies') {
        const lookupQuery = 'SELECT item_id FROM inventory WHERE item_name = ? AND status = "active"';
        db.query(lookupQuery, [item.item_name], (err, results) => {
          if (err) {
            console.error('Error looking up item_id:', err);
          } else if (results.length > 0) {
            itemId = results[0].item_id;
          }
          insertItem();
        });
        return;
      }

      insertItem();

      function insertItem() {
        db.query(insertItemQuery, [
          pr_id, item.item_classification, itemName, itemId, assetId, quantity, cost,
          item.additional_charge, additionalCost, itemTotal
        ], (err) => {
          if (err) console.error('Error inserting item:', err);
          checkComplete();
        });
      }
    });

    function checkComplete() {
      completedItems++;
      if (completedItems === totalItems) {
        res.json({
          success: true,
          message: 'Procurement request updated successfully'
        });
      }
    }

    if (totalItems === 0) {
      res.json({
        success: true,
        message: 'Procurement request updated successfully'
      });
    }
  }
});

router.patch('/:pr_id/status', (req, res) => {
  const db = req.app.locals.db;
  const { pr_id } = req.params;
  const { status, rejection_reason } = req.body;

  const getQuery = 'SELECT base_id, status as current_status FROM procurement_requests WHERE pr_id = ?';
  db.query(getQuery, [pr_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching procurement request'
      });
    }
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Procurement request not found'
      });
    }

    const request = results[0];
    let base_id = request.base_id;

    const continueStatusUpdate = () => {
      if (request.current_status === 'Waiting Approval' && status === 'Rejected') {
        const updateQuery = `
          UPDATE procurement_requests
          SET status = 'Draft', rejected_from_waiting = TRUE, pr_id = ?, rejection_reason = ?
          WHERE pr_id = ?
        `;
        db.query(updateQuery, [`PR${base_id.toString().padStart(5, '0')}`, rejection_reason || null, pr_id], (err, result) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Error updating procurement request status'
            });
          }
          res.json({
            success: true,
            message: 'Procurement request status updated successfully'
          });
        });
        return;
      }

      let new_pr_id = '';
      if (status === 'Approved') {
        new_pr_id = 'PO' + base_id.toString().padStart(5, '0');
      } else if (status === 'Received') {
        new_pr_id = 'GR' + base_id.toString().padStart(5, '0');
      } else if (status === 'Rejected' || status === 'Draft') {
        if (request.current_status === 'Approved') {
          new_pr_id = 'PO' + base_id.toString().padStart(5, '0');
        } else if (request.current_status === 'Received') {
          new_pr_id = 'GR' + base_id.toString().padStart(5, '0');
        } else {
          new_pr_id = 'PR' + base_id.toString().padStart(5, '0');
        }
      } else {
        new_pr_id = 'PR' + base_id.toString().padStart(5, '0');
      }

      if (request.current_status === 'Received' && status === 'Rejected') {
        decreaseQuantitiesOnDelete(pr_id, (err) => {
          if (err) {
            console.error('Error decreasing quantities on status change:', err);
          }
          proceedWithStatusUpdate();
        });
      } else {
        proceedWithStatusUpdate();
      }

      function proceedWithStatusUpdate() {
        db.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
          if (err) {
            console.error('Error disabling FK checks:', err);
            return res.status(500).json({
              success: false,
              message: 'Error updating procurement request status'
            });
          }

          const updateQuery = 'UPDATE procurement_requests SET status = ?, pr_id = ?, rejection_reason = ? WHERE pr_id = ?';

          updateItemsPrId(pr_id, new_pr_id, (err) => {
            if (err) {
              console.error('Error updating items pr_id:', err);
              db.query('SET FOREIGN_KEY_CHECKS = 1');
              return res.status(500).json({
                success: false,
                message: 'Error updating procurement request items: ' + err.message
              });
            }

            db.query(updateQuery, [status, new_pr_id, rejection_reason || null, pr_id], (err, result) => {
              db.query('SET FOREIGN_KEY_CHECKS = 1');

              if (err) {
                console.error('SQL Error:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                  if (status === 'Approved') {
                    new_pr_id = 'PO' + base_id.toString().padStart(5, '0');
                  } else if (status === 'Received') {
                    new_pr_id = 'GR' + base_id.toString().padStart(5, '0');
                  } else if (status === 'Rejected' || status === 'Draft') {
                    if (request.current_status === 'Approved') {
                      new_pr_id = 'PO' + base_id.toString().padStart(5, '0');
                    } else if (request.current_status === 'Received') {
                      new_pr_id = 'GR' + base_id.toString().padStart(5, '0');
                    } else {
                      new_pr_id = 'PR' + base_id.toString().padStart(5, '0');
                    }
                  } else {
                    new_pr_id = 'PR' + base_id.toString().padStart(5, '0');
                  }

                  db.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
                    if (err) {
                      console.error('Error disabling FK checks (retry):', err);
                      return res.status(500).json({
                        success: false,
                        message: 'Error updating procurement request status'
                      });
                    }

                    updateItemsPrId(pr_id, new_pr_id, (err2) => {
                      if (err2) {
                        console.error('Error updating items pr_id (retry):', err2);
                        db.query('SET FOREIGN_KEY_CHECKS = 1');
                        return res.status(500).json({
                          success: false,
                          message: 'Error updating procurement request items: ' + err2.message
                        });
                      }
                      db.query(updateQuery, [status, new_pr_id, base_id, rejection_reason || null, pr_id], (err3, result3) => {
                        db.query('SET FOREIGN_KEY_CHECKS = 1');
                        if (err3) {
                          console.error('SQL Error (retry):', err3);
                          return res.status(500).json({
                            success: false,
                            message: 'Error updating procurement request status: ' + err3.message
                          });
                        }
                        res.json({
                          success: true,
                          message: 'Procurement request status updated successfully'
                        });
                      });
                    });
                  });
                } else {
                  return res.status(500).json({
                    success: false,
                    message: 'Error updating procurement request status: ' + err.message
                  });
                }
              }
      if (status === 'Received') {
                updateQuantitiesOnReceived(new_pr_id, (err) => {
                  if (err) console.error('Error updating quantities:', err);
                });
              }
              res.json({
                success: true,
                message: 'Procurement request status updated successfully'
              });
            });
          });
        });
      }
    };

    if (STATUS_REQUIRES_VALID_QUOTATION.has(status)) {
      const getItemsQuery = `
        SELECT quantity, cost
        FROM procurement_request_items
        WHERE pr_id = ?
      `;

      db.query(getItemsQuery, [pr_id], (itemsErr, itemsResults) => {
        if (itemsErr) {
          return res.status(500).json({
            success: false,
            message: 'Error validating procurement items for status change'
          });
        }

        const validation = validateItemsForSubmission(itemsResults || []);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.message
          });
        }

        continueStatusUpdate();
      });
      return;
    }

    continueStatusUpdate();
  });

  function updateItemsPrId(oldPrId, newPrId, callback) {
    const updateItemsQuery = 'UPDATE procurement_request_items SET pr_id = ? WHERE pr_id = ?';
    db.query(updateItemsQuery, [newPrId, oldPrId], (err) => {
      if (err) {
        console.error('Error updating items pr_id:', err);
        return callback(err);
      }
      callback(null);
    });
  }

  function updateQuantitiesOnReceived(pr_id, callback) {
    const getItemsQuery = 'SELECT * FROM procurement_request_items WHERE pr_id = ?';
    db.query(getItemsQuery, [pr_id], (err, items) => {
      if (err) {
        console.error('Error fetching procurement items:', err);
        return callback(err);
      }

      let updatedCount = 0;
      const totalItems = items.length;

      if (totalItems === 0) {
        return callback(null);
      }

      items.forEach(item => {
        if (item.item_classification === 'Supplies' && item.item_id) {
          const updateInventoryQuery = `
            UPDATE inventory 
            SET stock_quantity = stock_quantity + ?,
                stock_status = CASE 
                  WHEN stock_quantity + ? = 0 THEN 'out_of_stock'
                  WHEN stock_quantity + ? <= minimum_stock THEN 'low_stock'
                  ELSE 'in_stock'
                END
            WHERE item_id = ?
          `;
          db.query(updateInventoryQuery, [item.quantity, item.quantity, item.quantity, item.item_id], (err) => {
            if (err) console.error('Error updating inventory quantity:', err);
            updatedCount++;
            if (updatedCount === totalItems) callback(null);
          });
        } else if (item.item_classification === 'Assets' && item.asset_id) {
          const updateAssetsQuery = 'UPDATE assets SET quantity = quantity + ? WHERE asset_id = ?';
          db.query(updateAssetsQuery, [item.quantity, item.asset_id], (err) => {
            if (err) console.error('Error updating assets quantity:', err);
            updatedCount++;
            if (updatedCount === totalItems) callback(null);
          });
        } else {
          updatedCount++;
          if (updatedCount === totalItems) callback(null);
        }
      });
    });
  }

  function decreaseQuantitiesOnDelete(pr_id, callback) {
    const getItemsQuery = 'SELECT * FROM procurement_request_items WHERE pr_id = ?';
    db.query(getItemsQuery, [pr_id], (err, items) => {
      if (err) {
        console.error('Error fetching procurement items:', err);
        return callback(err);
      }

      let updatedCount = 0;
      const totalItems = items.length;

      if (totalItems === 0) {
        return callback(null);
      }

      items.forEach(item => {
        if (item.item_classification === 'Supplies' && item.item_id) {
          const updateInventoryQuery = `
            UPDATE inventory 
            SET stock_quantity = stock_quantity - ?,
                stock_status = CASE 
                  WHEN stock_quantity - ? = 0 THEN 'out_of_stock'
                  WHEN stock_quantity - ? <= minimum_stock THEN 'low_stock'
                  ELSE 'in_stock'
                END
            WHERE item_id = ?
          `;
          db.query(updateInventoryQuery, [item.quantity, item.quantity, item.quantity, item.item_id], (err) => {
            if (err) console.error('Error decreasing inventory quantity:', err);
            updatedCount++;
            if (updatedCount === totalItems) callback(null);
          });
        } else if (item.item_classification === 'Assets' && item.asset_id) {
          const updateAssetsQuery = 'UPDATE assets SET quantity = quantity - ? WHERE asset_id = ?';
          db.query(updateAssetsQuery, [item.quantity, item.asset_id], (err) => {
            if (err) console.error('Error decreasing assets quantity:', err);
            updatedCount++;
            if (updatedCount === totalItems) callback(null);
          });
        } else {
          updatedCount++;
          if (updatedCount === totalItems) callback(null);
        }
      });
    });
  }
});

function decreaseQuantitiesOnDeleteGlobal(db, pr_id, callback) {
  const getItemsQuery = 'SELECT * FROM procurement_request_items WHERE pr_id = ?';
  db.query(getItemsQuery, [pr_id], (err, items) => {
    if (err) {
      console.error('Error fetching procurement items:', err);
      return callback(err);
    }

    let updatedCount = 0;
    const totalItems = items.length;

    if (totalItems === 0) {
      return callback(null);
    }

    items.forEach(item => {
      if (item.item_classification === 'Supplies' && item.item_id) {
        const updateInventoryQuery = `
          UPDATE inventory 
          SET stock_quantity = stock_quantity - ?,
              stock_status = CASE 
                WHEN stock_quantity - ? = 0 THEN 'out_of_stock'
                WHEN stock_quantity - ? <= minimum_stock THEN 'low_stock'
                ELSE 'in_stock'
              END
          WHERE item_id = ?
        `;
        db.query(updateInventoryQuery, [item.quantity, item.quantity, item.quantity, item.item_id], (err) => {
          if (err) console.error('Error decreasing inventory quantity:', err);
          updatedCount++;
          if (updatedCount === totalItems) callback(null);
        });
      } else if (item.item_classification === 'Assets' && item.asset_id) {
        const updateAssetsQuery = 'UPDATE assets SET quantity = quantity - ? WHERE asset_id = ?';
        db.query(updateAssetsQuery, [item.quantity, item.asset_id], (err) => {
          if (err) console.error('Error decreasing assets quantity:', err);
          updatedCount++;
          if (updatedCount === totalItems) callback(null);
        });
      } else {
        updatedCount++;
        if (updatedCount === totalItems) callback(null);
      }
    });
  });
}

router.delete('/:pr_id', (req, res) => {
  const db = req.app.locals.db;
  const { pr_id } = req.params;
  const { status, rejection_reason } = req.query;

  if (status === 'deleted') {
    const getQuery = 'SELECT base_id FROM procurement_requests WHERE pr_id = ?';
    db.query(getQuery, [pr_id], (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error fetching procurement request'
        });
      }
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Procurement request not found'
        });
      }

      const base_id = results[0].base_id;
      const new_pr_id = 'GR' + base_id.toString().padStart(5, '0');

      decreaseQuantitiesOnDeleteGlobal(db, pr_id, (err) => {
        if (err) {
          console.error('Error decreasing quantities on delete:', err);
        }

        const updateQuery = 'UPDATE procurement_requests SET status = ?, deleted_from_received = TRUE, pr_id = ?, rejection_reason = ? WHERE pr_id = ?';
        db.query(updateQuery, ['Rejected', new_pr_id, rejection_reason || null, pr_id], (err, result) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Error updating procurement request status'
            });
          }
          res.json({
            success: true,
            message: 'Procurement request moved to Rejected status'
          });
        });
      });
    });
  } else {
    const query = 'DELETE FROM procurement_requests WHERE pr_id = ?';

    db.query(query, [pr_id], (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error deleting procurement request'
        });
      }
      res.json({
        success: true,
        message: 'Procurement request deleted successfully'
      });
    });
  }
});

module.exports = router;
