const express = require('express');
const router = express.Router();

// GET all vendors
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  const query = `
    SELECT vendor_id, vendor_name, contact_person, phone_number, email, city, created_at
    FROM vendors
    ORDER BY vendor_name ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching vendors:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching vendors'
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});

// GET single vendor by ID
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const vendorId = req.params.id;

  const query = `
    SELECT vendor_id, vendor_name, contact_person, phone_number, email, city, created_at
    FROM vendors
    WHERE vendor_id = ?
  `;

  db.query(query, [vendorId], (err, results) => {
    if (err) {
      console.error('Error fetching vendor:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching vendor'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

// POST create new vendor
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { vendor_name, contact_person, phone_number, email, city } = req.body;

  if (!vendor_name) {
    return res.status(400).json({
      success: false,
      message: 'Vendor name is required'
    });
  }

  const query = `
    INSERT INTO vendors (vendor_name, contact_person, phone_number, email, city)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [vendor_name, contact_person, phone_number, email, city], (err, result) => {
    if (err) {
      console.error('Error creating vendor:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating vendor'
      });
    }

    // Fetch the created vendor
    const selectQuery = 'SELECT * FROM vendors WHERE vendor_id = ?';
    db.query(selectQuery, [result.insertId], (err, results) => {
      if (err) {
        console.error('Error fetching created vendor:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching created vendor'
        });
      }

      res.json({
        success: true,
        message: 'Vendor created successfully',
        data: results[0]
      });
    });
  });
});

// PUT update vendor
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const vendorId = req.params.id;
  const { vendor_name, contact_person, phone_number, email, city } = req.body;

  if (!vendor_name) {
    return res.status(400).json({
      success: false,
      message: 'Vendor name is required'
    });
  }

  const query = `
    UPDATE vendors
    SET vendor_name = ?, contact_person = ?, phone_number = ?, email = ?, city = ?
    WHERE vendor_id = ?
  `;

  db.query(query, [vendor_name, contact_person, phone_number, email, city, vendorId], (err, result) => {
    if (err) {
      console.error('Error updating vendor:', err);
      return res.status(500).json({
        success: false,
        message: 'Error updating vendor'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Fetch the updated vendor
    const selectQuery = 'SELECT * FROM vendors WHERE vendor_id = ?';
    db.query(selectQuery, [vendorId], (err, results) => {
      if (err) {
        console.error('Error fetching updated vendor:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching updated vendor'
        });
      }

      res.json({
        success: true,
        message: 'Vendor updated successfully',
        data: results[0]
      });
    });
  });
});

// DELETE vendor
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const vendorId = req.params.id;

  console.log('Attempting to delete vendor with ID:', vendorId);

  // First get the vendor name
  const getVendorNameQuery = 'SELECT vendor_name FROM vendors WHERE vendor_id = ?';
  db.query(getVendorNameQuery, [vendorId], (err, vendorNameResults) => {
    if (err) {
      console.error('Error fetching vendor name:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking vendor usage: ' + err.message
      });
    }

    if (vendorNameResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const vendorName = vendorNameResults[0].vendor_name;
    console.log('Vendor name:', vendorName);

    // Check if vendor is used in inventory
    const checkInventoryQuery = 'SELECT COUNT(*) as count FROM inventory WHERE vendor = ?';
    db.query(checkInventoryQuery, [vendorName], (err, inventoryResults) => {
      if (err) {
        console.error('Error checking vendor usage in inventory:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking vendor usage in inventory: ' + err.message
        });
      }

      console.log('Inventory check results:', inventoryResults);

      // Check if vendor is used in procurement requests
      const checkProcurementQuery = `
        SELECT pr.pr_id, pr.status
        FROM procurement_requests pr
        WHERE pr.supplier = ?
        AND pr.status IN ('Waiting Approval', 'Approved')
      `;
      db.query(checkProcurementQuery, [vendorName], (err, procurementResults) => {
        if (err) {
          console.error('Error checking vendor usage in procurement:', err);
          return res.status(500).json({
            success: false,
            message: 'Error checking vendor usage in procurement: ' + err.message
          });
        }

        console.log('Procurement check results:', procurementResults);

        // If vendor is in use, return usage details
        if (inventoryResults[0].count > 0 || procurementResults.length > 0) {
          const usage = {
            inventory: inventoryResults[0].count > 0 ? { count: inventoryResults[0].count } : null,
            procurement: procurementResults.length > 0 ? procurementResults : null,
            assets: null
          };
          console.log('Vendor is in use, returning usage:', usage);
          return res.status(400).json({
            success: false,
            message: 'Vendor cannot be deleted. They are in use.',
            usage: usage
          });
        }

        const deleteQuery = 'DELETE FROM vendors WHERE vendor_id = ?';
        db.query(deleteQuery, [vendorId], (err, result) => {
          if (err) {
            console.error('Error deleting vendor:', err);
            return res.status(500).json({
              success: false,
              message: 'Error deleting vendor: ' + err.message
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              success: false,
              message: 'Vendor not found'
            });
          }

          res.json({
            success: true,
            message: 'Vendor deleted successfully'
          });
        });
      });
    });
  });
});

module.exports = router;
