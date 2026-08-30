'use strict';

const carbonEngine = require('../services/carbonEngine');
const taxEngine = require('../services/taxEngine');
const { query } = require('../db');

/**
 * GET /api/v1/metrics/summary/:storeId
 * Fetches the aggregated dashboard metrics for a specific donor (storeId).
 */
async function getMetricsSummary(req, res) {
  try {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2100-01-01');

    // Fetch Carbon and ESG metrics
    const carbonAgg = await carbonEngine.aggregateEmissionsAvoidance({
      donorId: storeId,
      startDate: start,
      endDate: end
    });

    // Fetch Financial / Tax metrics
    const taxAgg = await taxEngine.aggregateTaxDeductions({
      donorId: storeId,
      startDate: start,
      endDate: end
    });

    // Fetch recent donations for the historical table and CSV export
    const historySql = `
      SELECT 
        d.id, d.classification, d.total_weight_lbs, d.cost_basis, d.retail_value, 
        d.enhanced_deduction, d.delivered_at, d.status,
        cm.avoided_co2e_lbs, cm.methane_avoided_kg, cm.meals_equivalent,
        r.legal_name as recipient_name
      FROM donations d
      LEFT JOIN carbon_metrics cm ON cm.donation_id = d.id
      LEFT JOIN recipients r ON r.id = d.recipient_id
      WHERE d.donor_id = $1 AND d.status IN ('DELIVERED', 'RECEIPT_ISSUED')
      ORDER BY d.delivered_at DESC NULLS LAST
      LIMIT 100
    `;
    const historyRes = await query(historySql, [storeId]);

    const payload = {
      storeId,
      periodStart: start,
      periodEnd: end,
      totalRescuedWeightLbs: carbonAgg.totalWeightLbs,
      totalTaxDeductionValue: taxAgg.totalTaxDeductionValue,
      totalAvoidedCO2eKg: carbonAgg.totalAvoidedCO2eLbs * 0.453592, // Convert lbs to kg if not already kg in aggregate (Wait, aggregate returns totalAvoidedCO2eLbs, we should return kg)
      totalMethaneAvoidedKg: carbonAgg.totalMethaneAvoidedKg,
      totalMealsEquivalent: carbonAgg.totalMealsEquivalent,
      recentDonations: historyRes.rows.map(row => ({
        id: row.id,
        classification: row.classification,
        weight_lbs: parseFloat(row.total_weight_lbs),
        cost_basis: parseFloat(row.cost_basis || 0),
        retail_value: parseFloat(row.retail_value || 0),
        tax_deduction_usd: parseFloat(row.enhanced_deduction || 0),
        co2e_kg: parseFloat(row.avoided_co2e_lbs || 0) * 0.453592,
        methane_kg: parseFloat(row.methane_avoided_kg || 0),
        meals_equivalent: parseInt(row.meals_equivalent || 0, 10),
        recipient_name: row.recipient_name || 'N/A',
        date: row.delivered_at
      }))
    };

    res.json({ success: true, data: payload });

  } catch (error) {
    console.error('[metricsController] Error fetching summary:', error);
    res.status(500).json({ success: false, error: 'Failed to compute metrics summary' });
  }
}

module.exports = {
  getMetricsSummary
};
