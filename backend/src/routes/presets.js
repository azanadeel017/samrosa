'use strict';

/**
 * @module routes/presets
 * @description CRUD routes for item presets (synced to Supabase).
 *
 * Endpoints:
 *   GET    /api/v1/presets/:storeId  — List all presets for a store
 *   POST   /api/v1/presets           — Create a new preset
 *   DELETE /api/v1/presets/:id       — Delete a preset by ID
 */

const express = require('express');
const { query } = require('../db');

const router = express.Router();

const VALID_CATEGORIES = new Set([
  'BAKERY', 'PRODUCE', 'PREPARED_MEALS', 'DAIRY_MEAT', 'SHELF_STABLE',
]);

// ─── GET /api/v1/presets/:storeId ─────────────────────────────────────────────
router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await query(
      `SELECT id, store_id, name, category, unit, cost_basis, retail_value, created_at
       FROM item_presets
       WHERE store_id = $1
       ORDER BY created_at DESC`,
      [storeId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id:          row.id,
        storeId:     row.store_id,
        name:        row.name,
        category:    row.category,
        unit:        row.unit,
        costBasis:   parseFloat(row.cost_basis),
        retailValue: parseFloat(row.retail_value),
      })),
    });
  } catch (err) {
    console.error('[presets] GET error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch presets.' });
  }
});

// ─── POST /api/v1/presets ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const store_id     = req.body.store_id || req.body.storeId;
  const name         = req.body.name;
  const category     = req.body.category;
  const unit         = req.body.unit;
  const cost_basis   = req.body.cost_basis !== undefined ? req.body.cost_basis : req.body.costBasis;
  const retail_value = req.body.retail_value !== undefined ? req.body.retail_value : req.body.retailValue;

  const errors = [];

  if (!store_id) errors.push('store_id is required.');
  if (!name || typeof name !== 'string' || name.trim().length < 1) errors.push('name is required.');
  if (!category || !VALID_CATEGORIES.has(category)) {
    errors.push(`category must be one of: ${[...VALID_CATEGORIES].join(', ')}.`);
  }

  const cost   = parseFloat(cost_basis);
  const retail = parseFloat(retail_value);
  if (!Number.isFinite(cost) || cost < 0) errors.push('cost_basis must be >= 0.');
  if (!Number.isFinite(retail) || retail <= 0) errors.push('retail_value must be > 0.');
  if (Number.isFinite(cost) && Number.isFinite(retail) && cost > retail) {
    errors.push('cost_basis cannot exceed retail_value.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed.', details: errors });
  }

  try {
    const result = await query(
      `INSERT INTO item_presets (store_id, name, category, unit, cost_basis, retail_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, store_id, name, category, unit, cost_basis, retail_value`,
      [store_id, name.trim(), category, (unit || 'lbs').trim(), cost, retail]
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id:          row.id,
        storeId:     row.store_id,
        name:        row.name,
        category:    row.category,
        unit:        row.unit,
        costBasis:   parseFloat(row.cost_basis),
        retailValue: parseFloat(row.retail_value),
      },
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ success: false, error: 'Referenced donor (store_id) does not exist.' });
    }
    console.error('[presets] POST error:', err);
    res.status(500).json({ success: false, error: 'Failed to create preset.' });
  }
});

// ─── DELETE /api/v1/presets/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM item_presets WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Preset not found.' });
    }

    res.json({ success: true, data: { id: req.params.id }, deleted: req.params.id });
  } catch (err) {
    console.error('[presets] DELETE error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete preset.' });
  }
});

module.exports = router;
