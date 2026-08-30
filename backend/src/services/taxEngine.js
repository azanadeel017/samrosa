'use strict';

/**
 * @module services/taxEngine
 * @description IRC § 170(e)(3) Enhanced Deduction computation and tax receipt
 * generation engine for samrosa's food donation compliance pipeline.
 */

const { getClient } = require('../db');
const { randomBytes } = require('crypto');

const NET_INCOME_CEILING_RATE = 0.15;
const RECEIPT_NUMBER_PREFIX = 'SR';

/**
 * Compute the IRC § 170(e)(3) enhanced deduction.
 * Formula: Minimum of:
 *   - (Cost Basis) + 0.5 * (Fair Market Value - Cost Basis)
 *   - 2 * (Cost Basis)
 */
function computeEnhancedDeduction({ costBasis, retailValue }) {
  if (costBasis < 0) throw new RangeError('costBasis must be ≥ 0');
  if (retailValue <= 0) throw new RangeError('retailValue must be > 0');
  if (costBasis > retailValue) throw new RangeError('costBasis must not exceed retailValue');

  const formula1 = costBasis + 0.5 * (retailValue - costBasis);
  const formula2 = 2 * costBasis;

  const enhancedDeduction = Math.min(formula1, formula2);
  const standardDeduction = Math.min(costBasis, retailValue);
  const incrementalBenefit = parseFloat((enhancedDeduction - standardDeduction).toFixed(2));

  return {
    enhancedDeduction: parseFloat(enhancedDeduction.toFixed(2)),
    standardDeduction: parseFloat(standardDeduction.toFixed(2)),
    incrementalBenefit,
  };
}

/**
 * Apply the 15% net income ceiling to a computed enhanced deduction.
 */
function applyCeilingRule({ enhancedDeduction, donorNetIncome }) {
  if (donorNetIncome <= 0) throw new RangeError('donorNetIncome must be > 0');

  const ceiling = parseFloat((donorNetIncome * NET_INCOME_CEILING_RATE).toFixed(2));
  const allowableDeduction = Math.min(enhancedDeduction, ceiling);

  return {
    allowableDeduction: parseFloat(allowableDeduction.toFixed(2)),
    ceiling,
    ceilingApplied: allowableDeduction < enhancedDeduction,
  };
}

function generateReceiptNumber(taxYear) {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `${RECEIPT_NUMBER_PREFIX}-${taxYear}-${suffix}`;
}

/**
 * Construct the complete tax receipt payload for a delivered donation.
 */
function buildReceiptPayload({ donation, donor, recipient, donorNetIncome, taxYear }) {
  const { enhancedDeduction } = computeEnhancedDeduction({
    costBasis: parseFloat(donation.cost_basis),
    retailValue: parseFloat(donation.retail_value),
  });

  const { allowableDeduction: deductionCeiling } = applyCeilingRule({
    enhancedDeduction,
    donorNetIncome,
  });

  return {
    donation_id: donation.id,
    donor_id: donor.id,
    recipient_id: recipient.id,
    total_weight_lbs: donation.total_weight_lbs,
    cost_basis: donation.cost_basis,
    retail_value: donation.retail_value,
    enhanced_deduction: enhancedDeduction,
    deduction_ceiling: deductionCeiling,
    tax_year: taxYear,
    description_snapshot: donation.description,
    receipt_number: generateReceiptNumber(taxYear),
  };
}

function checkQualification({ donor, recipient }) {
  const failures = [];

  if (!donor.is_active) {
    failures.push('Donor account is not currently active.');
  }
  if (!recipient.is_active) {
    failures.push('Recipient organization is not currently active.');
  }
  if (recipient.irs_determination !== 'CONFIRMED') {
    failures.push(`Recipient IRS 501(c)(3) status is '${recipient.irs_determination}', must be 'CONFIRMED'.`);
  }
  if (!donor.ein) {
    failures.push('Donor EIN is required for § 170(e)(3) documentation.');
  }

  return { qualified: failures.length === 0, failures };
}

/**
 * Securely transition a donation to DELIVERED and issue its tax receipt
 * within an atomic database transaction.
 */
async function markDeliveredAndIssueReceipt({ donationId, donorNetIncome, taxYear }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const donationRes = await client.query('SELECT * FROM donations WHERE id = $1 FOR UPDATE', [donationId]);
    if (donationRes.rowCount === 0) throw new Error('Donation not found');
    const donation = donationRes.rows[0];

    if (donation.status === 'RECEIPT_ISSUED' || donation.status === 'VOIDED' || donation.status === 'DELIVERED') {
      throw new Error(`Invalid status transition from ${donation.status}`);
    }

    if (!donation.recipient_id) {
      throw new Error('Donation must be matched with a recipient before delivery.');
    }

    const donorRes = await client.query('SELECT * FROM donors WHERE id = $1', [donation.donor_id]);
    const recipientRes = await client.query('SELECT * FROM recipients WHERE id = $1', [donation.recipient_id]);

    const donor = donorRes.rows[0];
    const recipient = recipientRes.rows[0];

    const qual = checkQualification({ donor, recipient });
    if (!qual.qualified) {
      throw new Error(`Qualification failed: ${qual.failures.join(' ')}`);
    }

    // This updates the status to DELIVERED effectively capturing that transition.
    // However, to keep it in a single logical step, we will also jump to RECEIPT_ISSUED right away.
    await client.query(
      `UPDATE donations SET status = 'DELIVERED', delivered_at = NOW() WHERE id = $1`,
      [donationId]
    );

    const payload = buildReceiptPayload({ donation, donor, recipient, donorNetIncome, taxYear });

    const insertSql = `
      INSERT INTO tax_receipts (
        donation_id, donor_id, recipient_id,
        total_weight_lbs, cost_basis, retail_value,
        enhanced_deduction, deduction_ceiling, tax_year,
        description_snapshot, receipt_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const insertVals = [
      payload.donation_id,
      payload.donor_id,
      payload.recipient_id,
      payload.total_weight_lbs,
      payload.cost_basis,
      payload.retail_value,
      payload.enhanced_deduction,
      payload.deduction_ceiling,
      payload.tax_year,
      payload.description_snapshot,
      payload.receipt_number
    ];

    const receiptRes = await client.query(insertSql, insertVals);

    await client.query(
      `UPDATE donations SET status = 'RECEIPT_ISSUED' WHERE id = $1`,
      [donationId]
    );

    await client.query('COMMIT');
    return receiptRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function aggregateTaxDeductions({ donorId, startDate, endDate }) {
  const { query } = require('../db');
  const start = startDate || new Date('2000-01-01');
  const end = endDate || new Date('2100-01-01');

  const sql = `
    SELECT 
      COUNT(*) as total_receipts,
      SUM(enhanced_deduction) as total_tax_deduction_value
    FROM tax_receipts
    WHERE donor_id = $1 AND issued_at >= $2 AND issued_at <= $3
  `;
  const res = await query(sql, [donorId, start, end]);
  const row = res.rows[0];

  return {
    donorId,
    periodStart: start,
    periodEnd: end,
    totalReceipts: parseInt(row.total_receipts || '0', 10),
    totalTaxDeductionValue: parseFloat(row.total_tax_deduction_value || '0'),
  };
}

module.exports = {
  computeEnhancedDeduction,
  applyCeilingRule,
  generateReceiptNumber,
  buildReceiptPayload,
  checkQualification,
  markDeliveredAndIssueReceipt,
  aggregateTaxDeductions,
  NET_INCOME_CEILING_RATE,
};
