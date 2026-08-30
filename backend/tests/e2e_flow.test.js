'use strict';
require('dotenv').config({ path: __dirname + '/../.env' });
const assert = require('assert');
const express = require('express');
const { pool, query } = require('../src/db');
const { logCarbonMetricsForDonation } = require('../src/services/carbonEngine');
const { markDeliveredAndIssueReceipt } = require('../src/services/taxEngine');
const donationsRouter = require('../src/routes/donations');
const metricsRouter = require('../src/routes/metrics');

async function runTest() {
  console.log('--- Starting E2E Flow Test ---');
  
  // 1. Setup Express
  const app = express();
  app.use(express.json());
  app.use('/api/donations', donationsRouter);
  app.use('/api/v1/metrics', metricsRouter);

  let server;
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      console.log('Test server running on port', server.address().port);
      resolve();
    });
  });
  
  const baseUrl = `http://localhost:${server.address().port}`;

  try {
    // 2. Fetch an active donor and recipient
    const donorRes = await query('SELECT id FROM donors WHERE is_active = TRUE LIMIT 1');
    assert(donorRes.rowCount > 0, 'No active donor found. Please run seed script first.');
    const storeId = donorRes.rows[0].id;

    const recRes = await query('SELECT id FROM recipients WHERE is_active = TRUE LIMIT 1');
    assert(recRes.rowCount > 0, 'No active recipient found. Please run seed script first.');
    const recipientId = recRes.rows[0].id;

    // 3. Get baseline metrics
    const baseMetricsRes = await fetch(`${baseUrl}/api/v1/metrics/summary/${storeId}`);
    const baseMetrics = (await baseMetricsRes.json()).data;

    // 4. Submit new donation via API
    const postData = {
      donor_id: storeId,
      description: 'E2E Test Bakery Surplus',
      classification: 'BAKERY',
      total_weight_lbs: 100,
      cost_basis: 50,
      retail_value: 100
    };

    const postRes = await fetch(`${baseUrl}/api/donations/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    
    assert.strictEqual(postRes.status, 201, 'POST /api/donations/upload failed');
    const postJson = await postRes.json();
    const transactionId = postJson.transaction_id;
    console.log('Uploaded donation:', transactionId);

    // 5. Simulate logistics engine matching the donation
    await query(`UPDATE donations SET status = 'MATCHED', recipient_id = $1 WHERE id = $2`, [recipientId, transactionId]);
    console.log('Donation matched to recipient.');

    // 6. Simulate delivery and tax processing
    await markDeliveredAndIssueReceipt({
      donationId: transactionId,
      donorNetIncome: 1000000,
      taxYear: new Date().getFullYear()
    });
    console.log('Donation delivered, tax receipt issued.');

    // 7. Simulate carbon engine processing
    await logCarbonMetricsForDonation(transactionId);
    console.log('Carbon metrics calculated and stored.');

    // 8. Get updated metrics
    const newMetricsRes = await fetch(`${baseUrl}/api/v1/metrics/summary/${storeId}`);
    const newMetrics = (await newMetricsRes.json()).data;

    // 9. Assertions
    const weightDiff = newMetrics.totalRescuedWeightLbs - baseMetrics.totalRescuedWeightLbs;
    const taxDiff = newMetrics.totalTaxDeductionValue - baseMetrics.totalTaxDeductionValue;
    const co2Diff = newMetrics.totalAvoidedCO2eKg - baseMetrics.totalAvoidedCO2eKg;
    const methaneDiff = newMetrics.totalMethaneAvoidedKg - baseMetrics.totalMethaneAvoidedKg;
    const mealsDiff = newMetrics.totalMealsEquivalent - baseMetrics.totalMealsEquivalent;

    console.log('Differences calculated:', { weightDiff, taxDiff, co2Diff, methaneDiff, mealsDiff });

    // Floating point precision checks
    assert(Math.abs(weightDiff - 100) < 0.01, `Weight diff expected 100, got ${weightDiff}`);
    assert(Math.abs(taxDiff - 75) < 0.01, `Tax diff expected 75, got ${taxDiff}`);
    assert(Math.abs(co2Diff - 90.72) < 0.01, `CO2e diff expected 90.72, got ${co2Diff}`);
    assert(Math.abs(methaneDiff - 3.24) < 0.01, `Methane diff expected 3.24, got ${methaneDiff}`);
    assert.strictEqual(mealsDiff, 83, `Meals diff expected 83, got ${mealsDiff}`);

    console.log('✅ End-to-End Metrics Integration Test Passed!');
  } catch (err) {
    console.error('❌ Test Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runTest();
