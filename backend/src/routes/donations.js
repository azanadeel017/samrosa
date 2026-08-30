'use strict';

/**
 * @module routes/donations
 * @description Express router handling all /api/donations endpoints.
 *
 * Endpoint inventory (v1):
 *   POST /api/donations/upload  — Merchant surplus food intake logging
 *
 * Validation philosophy:
 *   All input validation runs at the route layer before any DB interaction.
 *   The database layer provides a second safety net via CHECK constraints.
 *   This dual-layer approach prevents malformed data from ever reaching
 *   the query builder, and protects against constraint violations from
 *   direct DB access during development.
 *
 * Financial validation (IRC § 170(e)(3)):
 *   The enhanced deduction formula is: min(2 × cost_basis, retail_value)
 *   For this to be meaningful:
 *     • cost_basis must be ≥ 0 (donated food can have zero cost basis)
 *     • retail_value must be > 0 (food must have market value to qualify)
 *     • cost_basis must be ≤ retail_value (cost cannot exceed FMV — signals data error)
 *   These invariants are enforced here AND in the database schema.
 */

const express  = require('express');
const { query } = require('../db');

const router = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CLASSIFICATIONS = new Set(['BAKERY', 'PRODUCE', 'PREPARED_MEALS', 'DAIRY_MEAT', 'SHELF_STABLE']);

// ─── Validators ───────────────────────────────────────────────────────────────

/**
 * Validate the POST /upload request body.
 * Returns an array of human-readable error strings (empty = valid).
 *
 * @param {object} body - Express req.body
 * @returns {string[]}
 */
function validateUploadPayload(body) {
  const errors = [];

  const {
    donor_id,
    description,
    classification,
    total_weight_lbs,
    cost_basis,
    retail_value,
    item_count,
    expiration_date,
    pickup_window_start,
    pickup_window_end,
    requires_cold_chain,
    special_handling,
  } = body;

  // ── Required fields ────────────────────────────────────────────────────────

  if (!donor_id || typeof donor_id !== 'string' || donor_id.trim() === '') {
    errors.push('donor_id is required and must be a non-empty string (UUID).');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(donor_id)) {
    errors.push('donor_id must be a valid UUID v4.');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    errors.push('description is required and must be at least 3 characters.');
  }

  if (description && description.length > 2000) {
    errors.push('description must not exceed 2000 characters.');
  }

  // ── Classification ─────────────────────────────────────────────────────────

  if (!classification) {
    errors.push('classification is required.');
  } else if (!VALID_CLASSIFICATIONS.has(classification)) {
    errors.push(`classification must be one of: ${[...VALID_CLASSIFICATIONS].join(', ')}.`);
  }

  // ── Weight ─────────────────────────────────────────────────────────────────

  const weightNum = parseFloat(total_weight_lbs);
  if (total_weight_lbs === undefined || total_weight_lbs === null || total_weight_lbs === '') {
    errors.push('total_weight_lbs is required.');
  } else if (!Number.isFinite(weightNum)) {
    errors.push('total_weight_lbs must be a valid number.');
  } else if (weightNum <= 0) {
    errors.push('total_weight_lbs must be greater than 0.');
  } else if (weightNum > 999999.999) {
    errors.push('total_weight_lbs exceeds the maximum allowed value (999,999.999 lbs).');
  }

  // ── Financial fields ───────────────────────────────────────────────────────

  const costNum   = parseFloat(cost_basis);
  const retailNum = parseFloat(retail_value);

  if (cost_basis === undefined || cost_basis === null || cost_basis === '') {
    errors.push('cost_basis is required.');
  } else if (!Number.isFinite(costNum)) {
    errors.push('cost_basis must be a valid number.');
  } else if (costNum < 0) {
    errors.push('cost_basis must be greater than or equal to 0.');
  }

  if (retail_value === undefined || retail_value === null || retail_value === '') {
    errors.push('retail_value is required.');
  } else if (!Number.isFinite(retailNum)) {
    errors.push('retail_value must be a valid number.');
  } else if (retailNum <= 0) {
    errors.push('retail_value must be greater than 0.');
  }

  // Cross-field: cost cannot exceed FMV
  if (Number.isFinite(costNum) && Number.isFinite(retailNum) && costNum > retailNum) {
    errors.push('cost_basis must not exceed retail_value (cost of goods cannot exceed fair market value).');
  }

  // ── Optional fields ────────────────────────────────────────────────────────

  if (item_count !== undefined && item_count !== null) {
    const countNum = parseInt(item_count, 10);
    if (!Number.isInteger(countNum) || countNum <= 0) {
      errors.push('item_count must be a positive integer when provided.');
    }
  }

  if (expiration_date !== undefined && expiration_date !== null) {
    const d = new Date(expiration_date);
    if (isNaN(d.getTime())) {
      errors.push('expiration_date must be a valid ISO 8601 date string when provided.');
    }
  }

  if (pickup_window_start !== undefined && pickup_window_start !== null) {
    const start = new Date(pickup_window_start);
    if (isNaN(start.getTime())) {
      errors.push('pickup_window_start must be a valid ISO 8601 datetime string when provided.');
    } else if (pickup_window_end !== undefined && pickup_window_end !== null) {
      const end = new Date(pickup_window_end);
      if (isNaN(end.getTime())) {
        errors.push('pickup_window_end must be a valid ISO 8601 datetime string when provided.');
      } else if (end <= start) {
        errors.push('pickup_window_end must be after pickup_window_start.');
      }
    }
  }

  if (special_handling !== undefined && typeof special_handling !== 'string') {
    errors.push('special_handling must be a string when provided.');
  }

  return errors;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/donations/upload
 *
 * Merchant food surplus intake endpoint. Validates the payload, writes a
 * PENDING donation record to the database, and returns the generated
 * transaction UUID for reference in subsequent logistics and receipt calls.
 *
 * Request body (JSON):
 *   Required:
 *     donor_id          {string}  UUID of the enrolling donor
 *     description       {string}  Human-readable food description
 *     classification    {string}  "PERISHABLE" | "SHELF_STABLE"
 *     total_weight_lbs  {number}  > 0
 *     cost_basis        {number}  >= 0, USD
 *     retail_value      {number}  > 0, USD (fair market value)
 *
 *   Optional:
 *     item_count          {integer}  Discrete unit count
 *     expiration_date     {string}   ISO 8601 date
 *     pickup_window_start {string}   ISO 8601 datetime
 *     pickup_window_end   {string}   ISO 8601 datetime
 *     requires_cold_chain {boolean}  Default: false
 *     special_handling    {string}   Freeform handling notes
 *
 * Response 201:
 *   {
 *     "success": true,
 *     "transaction_id": "<uuid>",
 *     "enhanced_deduction": <number>,
 *     "status": "PENDING",
 *     "logged_at": "<ISO 8601 timestamp>"
 *   }
 *
 * Response 400: Validation failure (array of error messages)
 * Response 404: donor_id does not reference an active donor
 * Response 500: Internal server error
 */
router.post('/upload', async (req, res) => {
  // ── 1. Input validation ────────────────────────────────────────────────────
  const errors = validateUploadPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error:   'Validation failed.',
      details: errors,
    });
  }

  const {
    donor_id,
    description,
    classification,
    total_weight_lbs,
    cost_basis,
    retail_value,
    item_count         = null,
    expiration_date    = null,
    pickup_window_start = null,
    pickup_window_end   = null,
    requires_cold_chain = false,
    special_handling    = null,
  } = req.body;

  try {
    // ── 2. Verify donor exists and is active ────────────────────────────────
    const donorCheck = await query(
      'SELECT id FROM donors WHERE id = $1 AND is_active = TRUE',
      [donor_id]
    );

    if (donorCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error:   'Donor not found or is not currently active.',
        donor_id,
      });
    }

    // ── 3. Persist donation record ───────────────────────────────────────────
    // enhanced_deduction is a GENERATED ALWAYS AS column in the schema —
    // we do NOT insert it, but we read it back immediately via RETURNING.
    const insertSQL = `
      INSERT INTO donations (
        donor_id,
        description,
        classification,
        total_weight_lbs,
        cost_basis,
        retail_value,
        item_count,
        expiration_date,
        pickup_window_start,
        pickup_window_end,
        requires_cold_chain,
        special_handling,
        status,
        logged_at
      ) VALUES (
        $1, $2, $3, $4::NUMERIC, $5::NUMERIC, $6::NUMERIC,
        $7, $8, $9, $10, $11, $12, 'PENDING', NOW()
      )
      RETURNING
        id               AS transaction_id,
        enhanced_deduction,
        status,
        logged_at
    `;

    const values = [
      donor_id,
      description.trim(),
      classification,
      total_weight_lbs,
      cost_basis,
      retail_value,
      item_count,
      expiration_date,
      pickup_window_start,
      pickup_window_end,
      requires_cold_chain === true || requires_cold_chain === 'true',
      special_handling,
    ];

    const result = await query(insertSQL, values);
    const row    = result.rows[0];

    // ── 4. Return minimal, audit-safe response ───────────────────────────────
    return res.status(201).json({
      success:            true,
      transaction_id:     row.transaction_id,
      enhanced_deduction: parseFloat(row.enhanced_deduction),
      status:             row.status,
      logged_at:          row.logged_at,
    });

  } catch (err) {
    // Surface pg constraint violations as actionable 400s rather than opaque 500s
    if (err.code === '23514') {
      // check_violation — the DB caught something our validator missed
      return res.status(400).json({
        success: false,
        error:   'A database constraint was violated. Verify all field values and retry.',
        detail:  err.constraint || err.message,
      });
    }

    if (err.code === '23503') {
      // foreign_key_violation — donor_id not found (race condition after our check)
      return res.status(404).json({
        success: false,
        error:   'Referenced donor no longer exists.',
      });
    }

    console.error('[donations] POST /upload error:', err);
    return res.status(500).json({
      success: false,
      error:   'An internal server error occurred. Please try again later.',
    });
  }
});

module.exports = router;
