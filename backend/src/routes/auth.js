'use strict';

const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * POST /api/v1/auth/signup
 * Register a new donor/store account in the database.
 * Body: { id (optional user UUID), email, businessName, role }
 */
router.post('/signup', async (req, res) => {
  const { id, email, businessName, fullName, role } = req.body;
  const storeName = (businessName || fullName || 'My Store').trim();
  const contactEmail = (email || '').trim().toLowerCase();

  if (!contactEmail) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }

  try {
    let result;
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      result = await query(
        `INSERT INTO donors (id, legal_name, contact_email, address_line1, city, state, postal_code, is_active)
         VALUES ($1, $2, $3, '100 Main St', 'New Brunswick', 'NJ', '08901', true)
         ON CONFLICT (contact_email) DO UPDATE
           SET legal_name = EXCLUDED.legal_name, is_active = true
         RETURNING id, legal_name, contact_email`,
        [id, storeName, contactEmail]
      );
    } else {
      result = await query(
        `INSERT INTO donors (legal_name, contact_email, address_line1, city, state, postal_code, is_active)
         VALUES ($1, $2, '100 Main St', 'New Brunswick', 'NJ', '08901', true)
         ON CONFLICT (contact_email) DO UPDATE
           SET legal_name = EXCLUDED.legal_name, is_active = true
         RETURNING id, legal_name, contact_email`,
        [storeName, contactEmail]
      );
    }

    const donor = result.rows[0];
    return res.status(201).json({
      success: true,
      data: {
        storeId: donor.id,
        businessName: donor.legal_name,
        email: donor.contact_email,
      },
    });
  } catch (err) {
    console.error('[auth/signup] Error creating donor:', err);
    return res.status(500).json({ success: false, error: 'Failed to create store record.' });
  }
});

/**
 * GET /api/v1/auth/store/:idOrEmail
 * Retrieve or resolve store_id for a user
 */
router.get('/store/:idOrEmail', async (req, res) => {
  const { idOrEmail } = req.params;
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrEmail);
    const sql = isUUID
      ? 'SELECT id, legal_name, contact_email FROM donors WHERE id = $1'
      : 'SELECT id, legal_name, contact_email FROM donors WHERE contact_email = $1';

    const result = await query(sql, [idOrEmail.toLowerCase()]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const donor = result.rows[0];
    return res.json({
      success: true,
      data: {
        storeId: donor.id,
        businessName: donor.legal_name,
        email: donor.contact_email,
      },
    });
  } catch (err) {
    console.error('[auth/store] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to find store' });
  }
});

module.exports = router;
