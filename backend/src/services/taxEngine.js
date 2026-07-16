'use strict';

/**
 * @module services/taxEngine
 * @description IRC § 170(e)(3) Enhanced Deduction computation and tax receipt
 * generation engine for samrosa's food donation compliance pipeline.
 *
 * This module is the authoritative source for all tax-related calculations
 * performed on completed food donation transactions. It operates exclusively
 * on data retrieved from the PostgreSQL ledger and produces structured output
 * suitable for PDF receipt generation, IRS substantiation records, and
 * donor-facing annual deduction summary reports.
 *
 * Core responsibilities:
 *   1. Validate donor and recipient qualification under § 170(e)(3)
 *   2. Compute the enhanced deduction: min(2C, FMV)
 *   3. Apply the 15% net income ceiling per donor tax profile
 *   4. Issue and persist immutable tax receipt records
 *   5. Aggregate annual deduction summaries per donor EIN
 *
 * Integration points:
 *   - Triggered by the logistics engine upon delivery confirmation
 *   - Reads from: donors, recipients, donations tables
 *   - Writes to: tax_receipts table
 *   - Downstream consumers: receipt PDF renderer, donor dashboard API
 *
 * @see {@link https://www.irs.gov/publications/p526} IRS Publication 526
 * @see {@link https://www.law.cornell.edu/uscode/text/26/170} 26 U.S.C. § 170
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * The multiplier applied to cost basis under the § 170(e)(3) enhanced formula.
 * The deduction ceiling is the LESSER of (ENHANCED_DEDUCTION_MULTIPLIER × C) or FMV.
 * @constant {number}
 */
const ENHANCED_DEDUCTION_MULTIPLIER = 2;

/**
 * Maximum allowable enhanced food donation deduction as a fraction of the
 * donor entity's net income for the tax year (C-corp: taxable income;
 * pass-through: net profit from trade or business).
 * @constant {number}
 */
const NET_INCOME_CEILING_RATE = 0.15;

/**
 * Prefix for all human-readable receipt reference numbers.
 * Format: SR-{YEAR}-{RANDOM_ALPHANUMERIC_8}
 * @constant {string}
 */
const RECEIPT_NUMBER_PREFIX = 'SR';

// ─── Core Computation ─────────────────────────────────────────────────────────

/**
 * Compute the IRC § 170(e)(3) enhanced deduction for a single food donation.
 *
 * Formula: D = min(2C, FMV)
 * Where C = cost basis and FMV = fair market value at point of contribution.
 *
 * @param {object} params
 * @param {number} params.costBasis    - Donor's cost of goods (C), in USD. Must be ≥ 0.
 * @param {number} params.retailValue  - Fair market value (FMV) at donation time, in USD. Must be > 0.
 * @returns {{ enhancedDeduction: number, standardDeduction: number, incrementalBenefit: number }}
 *
 * @example
 * computeEnhancedDeduction({ costBasis: 180, retailValue: 423.75 })
 * // → { enhancedDeduction: 360, standardDeduction: 180, incrementalBenefit: 180 }
 */
function computeEnhancedDeduction({ costBasis, retailValue }) {
  if (costBasis < 0) throw new RangeError('costBasis must be ≥ 0');
  if (retailValue <= 0) throw new RangeError('retailValue must be > 0');
  if (costBasis > retailValue) throw new RangeError('costBasis must not exceed retailValue');

  const enhancedDeduction  = Math.min(ENHANCED_DEDUCTION_MULTIPLIER * costBasis, retailValue);
  const standardDeduction  = Math.min(costBasis, retailValue);
  const incrementalBenefit = parseFloat((enhancedDeduction - standardDeduction).toFixed(2));

  return {
    enhancedDeduction: parseFloat(enhancedDeduction.toFixed(2)),
    standardDeduction: parseFloat(standardDeduction.toFixed(2)),
    incrementalBenefit,
  };
}

/**
 * Apply the 15% net income ceiling to a computed enhanced deduction.
 * The final allowable deduction is the lesser of the enhanced formula result
 * and 15% of the donor's annual net income for the tax year.
 *
 * @param {object} params
 * @param {number} params.enhancedDeduction - Output of computeEnhancedDeduction().enhancedDeduction
 * @param {number} params.donorNetIncome    - Donor's annual net income for the tax year, in USD
 * @returns {{ allowableDeduction: number, ceiling: number, ceilingApplied: boolean }}
 */
function applyCeilingRule({ enhancedDeduction, donorNetIncome }) {
  if (donorNetIncome <= 0) throw new RangeError('donorNetIncome must be > 0');

  const ceiling            = parseFloat((donorNetIncome * NET_INCOME_CEILING_RATE).toFixed(2));
  const allowableDeduction = Math.min(enhancedDeduction, ceiling);

  return {
    allowableDeduction: parseFloat(allowableDeduction.toFixed(2)),
    ceiling,
    ceilingApplied: allowableDeduction < enhancedDeduction,
  };
}

// ─── Receipt Generation ───────────────────────────────────────────────────────

/**
 * Generate a unique, human-readable receipt reference number.
 * Format: SR-{YYYY}-{8 alphanumeric chars}
 *
 * @param {number} taxYear - The four-digit tax year (e.g. 2026)
 * @returns {string} e.g. "SR-2026-A3F9C421"
 */
function generateReceiptNumber(taxYear) {
  const { randomBytes } = require('crypto');
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `${RECEIPT_NUMBER_PREFIX}-${taxYear}-${suffix}`;
}

/**
 * Construct the complete tax receipt payload for a delivered donation.
 * This payload is persisted to the tax_receipts table and forms the basis
 * of the IRS substantiation document.
 *
 * @param {object} params
 * @param {object} params.donation    - Full donation row from the database
 * @param {object} params.donor       - Full donor row from the database
 * @param {object} params.recipient   - Full recipient row from the database
 * @param {number} params.donorNetIncome - Donor's annual net income for ceiling calculation
 * @param {number} params.taxYear        - Four-digit tax year
 * @returns {object} Structured receipt payload ready for DB insertion
 */
function buildReceiptPayload({ donation, donor, recipient, donorNetIncome, taxYear }) {
  const { enhancedDeduction } = computeEnhancedDeduction({
    costBasis:   parseFloat(donation.cost_basis),
    retailValue: parseFloat(donation.retail_value),
  });

  const { allowableDeduction: deductionCeiling } = applyCeilingRule({
    enhancedDeduction,
    donorNetIncome,
  });

  return {
    donation_id:          donation.id,
    donor_id:             donor.id,
    recipient_id:         recipient.id,
    total_weight_lbs:     donation.total_weight_lbs,
    cost_basis:           donation.cost_basis,
    retail_value:         donation.retail_value,
    enhanced_deduction:   enhancedDeduction,
    deduction_ceiling:    deductionCeiling,
    tax_year:             taxYear,
    description_snapshot: donation.description,
    receipt_number:       generateReceiptNumber(taxYear),
  };
}

// ─── Annual Aggregation ───────────────────────────────────────────────────────

/**
 * Aggregate all tax receipts for a given donor EIN and tax year into a
 * structured annual summary. Consumed by the donor dashboard API and
 * the year-end PDF report generator.
 *
 * @param {object} params
 * @param {string} params.donorEin       - Donor EIN in XX-XXXXXXX format
 * @param {number} params.taxYear        - Four-digit tax year
 * @param {import('../db').query} params.dbQuery - Injected database query function
 * @returns {Promise<object>} Annual deduction summary
 */
async function getAnnualSummary({ donorEin, taxYear, dbQuery }) {
  // Implementation: join tax_receipts → donations → donors on EIN + tax_year
  // Returns: { totalDonations, totalWeightLbs, totalCostBasis, totalRetailValue,
  //            totalEnhancedDeduction, receiptCount, receipts[] }
  throw new Error('taxEngine.getAnnualSummary: not yet implemented');
}

// ─── Qualification Check ──────────────────────────────────────────────────────

/**
 * Verify that a donor-recipient pairing satisfies all § 170(e)(3) qualification
 * prerequisites before a receipt is issued. Returns a structured result
 * rather than throwing, so the caller can surface granular failure reasons.
 *
 * @param {object} params
 * @param {object} params.donor     - Donor row from the database
 * @param {object} params.recipient - Recipient row from the database
 * @returns {{ qualified: boolean, failures: string[] }}
 */
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

// ─── Module Exports ───────────────────────────────────────────────────────────

module.exports = {
  computeEnhancedDeduction,
  applyCeilingRule,
  generateReceiptNumber,
  buildReceiptPayload,
  getAnnualSummary,
  checkQualification,
  // Constants exported for reference in route handlers and test suites
  ENHANCED_DEDUCTION_MULTIPLIER,
  NET_INCOME_CEILING_RATE,
};
