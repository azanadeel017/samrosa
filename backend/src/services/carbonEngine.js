'use strict';

/**
 * @module services/carbonEngine
 * @description Greenhouse gas (GHG) emissions avoidance quantification engine
 * for samrosa's environmental compliance and carbon credit pipeline.
 */

const { getClient, query } = require('../db');

const BASE_CO2E_PER_LB = 2.0;

const CATEGORY_MULTIPLIERS = {
  PERISHABLE: 1.2,
  SHELF_STABLE: 1.0,
};

/**
 * Compute the GHG emissions avoidance for a single food donation using
 * the EPA WARM v15 methodology.
 */
function computeEmissionsAvoidance({ weightLbs, classification }) {
  if (weightLbs <= 0) throw new RangeError('Weight must be > 0');
  
  const multiplier = CATEGORY_MULTIPLIERS[classification];
  if (!multiplier) {
    throw new TypeError(`Unknown classification: '${classification}'. Expected PERISHABLE or SHELF_STABLE.`);
  }

  const avoidedEmissionsLbs = weightLbs * BASE_CO2E_PER_LB * multiplier;

  return {
    weightLbs: parseFloat(weightLbs.toFixed(2)),
    classification,
    multiplier,
    avoidedEmissionsLbs: parseFloat(avoidedEmissionsLbs.toFixed(2))
  };
}

/**
 * Aggregate emissions avoidance across multiple donation records for a specific donor
 * over a customizable date range. Used for period-level ESG reporting.
 */
async function aggregateEmissionsAvoidance({ donorId, startDate, endDate }) {
  const sql = `
    SELECT 
      COUNT(*) as total_donations,
      SUM(weight_lbs) as total_weight_lbs,
      SUM(avoided_co2e_lbs) as total_avoided_co2e_lbs
    FROM carbon_metrics
    WHERE donor_id = $1 AND created_at >= $2 AND created_at <= $3
  `;
  const res = await query(sql, [donorId, startDate, endDate]);
  const row = res.rows[0];

  return {
    donorId,
    periodStart: startDate,
    periodEnd: endDate,
    totalDonations: parseInt(row.total_donations || '0', 10),
    totalWeightLbs: parseFloat(row.total_weight_lbs || '0'),
    totalAvoidedCO2eLbs: parseFloat(row.total_avoided_co2e_lbs || '0')
  };
}

/**
 * Prepare a structured carbon credit claim submission payload for an
 * external registry API (Gold Standard or Verra VCS).
 */
function submitCarbonCreditClaim({ registryId, aggregation, donorEin }) {
  return {
    claim_id: `CLAIM-${Date.now()}`,
    registry: registryId,
    donor_ein: donorEin,
    methodology: 'EPA WARM v15 - Landfill Diversion',
    project_type: 'Food Waste Diversion',
    total_avoided_co2e_lbs: aggregation.totalAvoidedCO2eLbs,
    reporting_period: {
      start: aggregation.periodStart,
      end: aggregation.periodEnd,
    },
    verification_status: 'SUBMITTED',
    timestamp: new Date().toISOString()
  };
}

/**
 * Integrates the calculation pipeline directly into the database transaction layer.
 * When a donation is successfully delivered, the carbon metrics are calculated 
 * and securely logged into the carbon_metrics table for auditing.
 */
async function logCarbonMetricsForDonation(donationId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const donationRes = await client.query('SELECT * FROM donations WHERE id = $1 FOR UPDATE', [donationId]);
    if (donationRes.rowCount === 0) throw new Error('Donation not found');
    const donation = donationRes.rows[0];

    // Assuming this function is called immediately after a donation is marked DELIVERED or RECEIPT_ISSUED.
    if (donation.status !== 'DELIVERED' && donation.status !== 'RECEIPT_ISSUED') {
      throw new Error(`Donation must be DELIVERED to log carbon metrics, current status is ${donation.status}`);
    }

    const metrics = computeEmissionsAvoidance({
      weightLbs: parseFloat(donation.total_weight_lbs),
      classification: donation.classification
    });

    const insertSql = `
      INSERT INTO carbon_metrics (donation_id, donor_id, weight_lbs, classification, avoided_co2e_lbs)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (donation_id) DO NOTHING
      RETURNING *;
    `;
    
    const insertVals = [
      donation.id,
      donation.donor_id,
      metrics.weightLbs,
      metrics.classification,
      metrics.avoidedEmissionsLbs
    ];

    const res = await client.query(insertSql, insertVals);
    await client.query('COMMIT');
    return res.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  computeEmissionsAvoidance,
  aggregateEmissionsAvoidance,
  submitCarbonCreditClaim,
  logCarbonMetricsForDonation,
  BASE_CO2E_PER_LB,
  CATEGORY_MULTIPLIERS,
};
