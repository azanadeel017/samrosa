'use strict';
require('dotenv').config({ path: __dirname + '/../.env' });
const { getClient, pool } = require('../src/db');
const { logCarbonMetricsForDonation } = require('../src/services/carbonEngine');
const { markDeliveredAndIssueReceipt } = require('../src/services/taxEngine');

async function seed() {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    console.log('Creating demo donor...');
    const donorRes = await client.query(`
      INSERT INTO donors (legal_name, contact_email, address_line1, city, state, postal_code, ein, is_active)
      VALUES ('Samrosa Demo Supermarket', 'store@samrosa.demo', '123 Market St', 'Seattle', 'WA', '98101', '12-3456789', true)
      ON CONFLICT (contact_email) DO UPDATE SET is_active = true
      RETURNING id;
    `);
    const donorId = donorRes.rows[0].id;
    console.log(`Donor Seeded: ${donorId}`);

    console.log('Creating demo recipient...');
    const recRes = await client.query(`
      INSERT INTO recipients (legal_name, contact_email, address_line1, city, state, postal_code, irs_determination, ein, is_active)
      VALUES ('Seattle Food Bank Demo', 'foodbank@samrosa.demo', '456 Charity Ave', 'Seattle', 'WA', '98102', 'CONFIRMED', '98-7654321', true)
      ON CONFLICT (contact_email) DO UPDATE SET is_active = true
      RETURNING id;
    `);
    const recipientId = recRes.rows[0].id;
    console.log(`Recipient Seeded: ${recipientId}`);

    const categories = ['BAKERY', 'PREPARED_MEALS', 'PRODUCE', 'DAIRY_MEAT', 'SHELF_STABLE'];
    // 10 realistic weights
    const weights = [15.5, 30.0, 8.0, 12.5, 45.0, 22.0, 5.5, 10.0, 18.0, 25.0];
    
    await client.query('COMMIT'); // Commit donor/recipient so engine services can query them

    console.log('Generating 10 historical donations...');
    for (let i = 0; i < 10; i++) {
      const category = categories[i % categories.length];
      const weight = weights[i];
      const cost = weight * 1.5;
      const retail = weight * 3.0;

      // Insert as MATCHED so the engine can pick it up
      const donRes = await pool.query(`
        INSERT INTO donations (donor_id, recipient_id, classification, total_weight_lbs, cost_basis, retail_value, description, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'MATCHED')
        RETURNING id;
      `, [donorId, recipientId, category, weight, cost, retail, `Demo surplus: ${weight} lbs of ${category}`]);
      
      const donationId = donRes.rows[0].id;

      // Trigger Tax engine which also sets status to DELIVERED and then RECEIPT_ISSUED
      await markDeliveredAndIssueReceipt({
        donationId,
        donorNetIncome: 500000,
        taxYear: new Date().getFullYear()
      });

      // Trigger Carbon Engine which expects status to be RECEIPT_ISSUED
      await logCarbonMetricsForDonation(donationId);
    }
    
    console.log('✅ Successfully seeded 10 realistic records.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed Error:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
