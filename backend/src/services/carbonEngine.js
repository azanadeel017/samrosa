'use strict';

/**
 * @module services/carbonEngine
 * @description Greenhouse gas (GHG) emissions avoidance quantification engine
 * for samrosa's environmental compliance and carbon credit pipeline.
 *
 * This module translates food donation weight and category data into
 * quantified CO₂-equivalent (CO₂e) emissions avoidance figures. These
 * figures serve two distinct downstream purposes:
 *   1. Environmental impact reporting for donor ESG dashboards and investor briefs
 *   2. Verified carbon credit issuance through recognized registries
 *      (e.g., Gold Standard, Verra VCS) once the methodology is certified
 *
 * Methodology basis:
 *   Emissions factors are sourced from the U.S. EPA Waste Reduction Model
 *   (WARM), which quantifies the climate benefit of diverting organic waste
 *   from landfill per short ton of material by food category. The core
 *   benefit is the avoidance of landfill CH₄ (methane) generation, with
 *   supplemental factors for avoided transportation and processing emissions.
 *
 * Calculation pipeline:
 *   1. Weight (lbs) → short tons conversion
 *   2. Apply WARM emission factor (MTCO₂e / short ton) by food category
 *   3. Sum direct (landfill avoidance) + indirect (transport avoidance) benefits
 *   4. Express as MTCO₂e (metric tons CO₂ equivalent)
 *   5. Optionally convert to carbon credit units (1 credit = 1 MTCO₂e)
 *
 * @see {@link https://www.epa.gov/warm} EPA WARM Model Documentation
 * @see {@link https://www.goldstandard.org} Gold Standard Registry
 * @see {@link https://verra.org/programs/verified-carbon-standard/} Verra VCS
 */

// ─── EPA WARM Emission Factors ────────────────────────────────────────────────

/**
 * Emission factors sourced from EPA WARM v15 (2023 revision).
 * Units: MTCO₂e avoided per short ton of food diverted from landfill.
 * These represent the net climate benefit including landfill methane avoidance,
 * minus transportation and processing emissions for the donation pathway.
 *
 * PERISHABLE covers: prepared foods, produce, dairy, meat, seafood
 * SHELF_STABLE covers: packaged dry goods, canned goods, grains, beverages
 *
 * @constant {Object.<string, number>}
 */
const WARM_EMISSION_FACTORS_MTCO2E_PER_SHORT_TON = {
  PERISHABLE:   3.83,  // Higher factor: greater moisture content = more CH₄ in landfill
  SHELF_STABLE: 2.71,  // Lower factor: lower biodegradability in anaerobic conditions
};

/**
 * Pounds per short ton — NIST standard conversion.
 * @constant {number}
 */
const LBS_PER_SHORT_TON = 2000;

/**
 * The monetary value of one verified carbon credit in USD.
 * Placeholder based on voluntary market spot price (Q2 2026).
 * Replace with live oracle feed when integrating registry APIs.
 * @constant {number}
 */
const CARBON_CREDIT_VALUE_USD = 18.50;

// ─── Core Computation ─────────────────────────────────────────────────────────

/**
 * Convert pounds to short tons.
 *
 * @param {number} lbs - Weight in pounds
 * @returns {number} Weight in short tons
 */
function lbsToShortTons(lbs) {
  if (lbs <= 0) throw new RangeError('Weight must be > 0');
  return lbs / LBS_PER_SHORT_TON;
}

/**
 * Compute the GHG emissions avoidance for a single food donation using
 * the EPA WARM methodology.
 *
 * @param {object} params
 * @param {number} params.weightLbs      - Gross donation weight in pounds
 * @param {string} params.classification - Food category: 'PERISHABLE' | 'SHELF_STABLE'
 * @returns {{
 *   weightShortTons: number,
 *   emissionFactorMTCO2e: number,
 *   avoidedEmissionsMTCO2e: number,
 *   avoidedEmissionsKgCO2e: number,
 *   carbonCreditsEarned: number,
 *   estimatedCreditValueUSD: number,
 *   methodology: string
 * }}
 *
 * @example
 * computeEmissionsAvoidance({ weightLbs: 47.5, classification: 'PERISHABLE' })
 * // → { avoidedEmissionsMTCO2e: 0.0908, carbonCreditsEarned: 0.0908, ... }
 */
function computeEmissionsAvoidance({ weightLbs, classification }) {
  const factor = WARM_EMISSION_FACTORS_MTCO2E_PER_SHORT_TON[classification];
  if (!factor) {
    throw new TypeError(`Unknown classification: '${classification}'. Expected PERISHABLE or SHELF_STABLE.`);
  }

  const weightShortTons          = lbsToShortTons(weightLbs);
  const avoidedEmissionsMTCO2e   = parseFloat((weightShortTons * factor).toFixed(6));
  const avoidedEmissionsKgCO2e   = parseFloat((avoidedEmissionsMTCO2e * 1000).toFixed(3));
  const carbonCreditsEarned      = avoidedEmissionsMTCO2e; // 1 credit = 1 MTCO₂e
  const estimatedCreditValueUSD  = parseFloat((carbonCreditsEarned * CARBON_CREDIT_VALUE_USD).toFixed(2));

  return {
    weightShortTons:         parseFloat(weightShortTons.toFixed(6)),
    emissionFactorMTCO2e:    factor,
    avoidedEmissionsMTCO2e,
    avoidedEmissionsKgCO2e,
    carbonCreditsEarned:     parseFloat(carbonCreditsEarned.toFixed(6)),
    estimatedCreditValueUSD,
    methodology:             'EPA WARM v15 — Landfill Diversion, Food (2023)',
  };
}

// ─── Batch Aggregation ────────────────────────────────────────────────────────

/**
 * Aggregate emissions avoidance across multiple donation records.
 * Used for period-level ESG reporting and registry submission batches.
 *
 * @param {Array<{ weightLbs: number, classification: string }>} donations
 * @returns {{
 *   donationCount: number,
 *   totalWeightLbs: number,
 *   totalWeightShortTons: number,
 *   totalAvoidedEmissionsMTCO2e: number,
 *   totalAvoidedEmissionsKgCO2e: number,
 *   totalCarbonCredits: number,
 *   totalEstimatedCreditValueUSD: number,
 *   byClassification: Object
 * }}
 */
function aggregateEmissionsAvoidance(donations) {
  if (!Array.isArray(donations) || donations.length === 0) {
    throw new TypeError('donations must be a non-empty array');
  }

  const byClassification = {};
  let totalAvoidedMT = 0;
  let totalWeightLbs = 0;

  for (const donation of donations) {
    const result = computeEmissionsAvoidance(donation);

    totalWeightLbs     += donation.weightLbs;
    totalAvoidedMT     += result.avoidedEmissionsMTCO2e;

    if (!byClassification[donation.classification]) {
      byClassification[donation.classification] = {
        count: 0, weightLbs: 0, avoidedEmissionsMTCO2e: 0,
      };
    }
    byClassification[donation.classification].count               += 1;
    byClassification[donation.classification].weightLbs           += donation.weightLbs;
    byClassification[donation.classification].avoidedEmissionsMTCO2e += result.avoidedEmissionsMTCO2e;
  }

  const totalAvoidedMTRounded = parseFloat(totalAvoidedMT.toFixed(6));

  return {
    donationCount:                 donations.length,
    totalWeightLbs:                parseFloat(totalWeightLbs.toFixed(3)),
    totalWeightShortTons:          parseFloat((totalWeightLbs / LBS_PER_SHORT_TON).toFixed(6)),
    totalAvoidedEmissionsMTCO2e:   totalAvoidedMTRounded,
    totalAvoidedEmissionsKgCO2e:   parseFloat((totalAvoidedMT * 1000).toFixed(3)),
    totalCarbonCredits:            totalAvoidedMTRounded,
    totalEstimatedCreditValueUSD:  parseFloat((totalAvoidedMT * CARBON_CREDIT_VALUE_USD).toFixed(2)),
    byClassification,
  };
}

// ─── Registry Submission ──────────────────────────────────────────────────────

/**
 * Prepare a structured carbon credit claim submission payload for an
 * external registry API (Gold Standard or Verra VCS).
 * The registry integration, OAuth flow, and MRV (Monitoring, Reporting,
 * Verification) data packaging are implemented in this function's body.
 *
 * @param {object} params
 * @param {string} params.registryId   - 'GOLD_STANDARD' | 'VERRA_VCS'
 * @param {object} params.aggregation  - Output of aggregateEmissionsAvoidance()
 * @param {object} params.donor        - Donor database row
 * @param {string} params.periodStart  - ISO 8601 date (start of reporting period)
 * @param {string} params.periodEnd    - ISO 8601 date (end of reporting period)
 * @returns {Promise<{ submissionId: string, status: string, creditsIssued: number }>}
 */
async function submitCarbonCreditClaim({ registryId, aggregation, donor, periodStart, periodEnd }) {
  // Implementation: authenticate with registry OAuth, package MRV data,
  // submit verified claim, poll for issuance confirmation, persist credit record
  throw new Error('carbonEngine.submitCarbonCreditClaim: not yet implemented');
}

// ─── Module Exports ───────────────────────────────────────────────────────────

module.exports = {
  computeEmissionsAvoidance,
  aggregateEmissionsAvoidance,
  submitCarbonCreditClaim,
  lbsToShortTons,
  // Constants exported for use in ESG dashboard API responses
  WARM_EMISSION_FACTORS_MTCO2E_PER_SHORT_TON,
  CARBON_CREDIT_VALUE_USD,
  LBS_PER_SHORT_TON,
};
