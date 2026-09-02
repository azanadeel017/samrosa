'use strict';
require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Creating item_presets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS item_presets (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id     UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
        name         TEXT NOT NULL,
        category     TEXT NOT NULL
          CHECK (category IN ('BAKERY','PRODUCE','PREPARED_MEALS','DAIRY_MEAT','SHELF_STABLE')),
        unit         TEXT NOT NULL DEFAULT 'lbs',
        cost_basis   NUMERIC(12,2) NOT NULL CHECK (cost_basis >= 0),
        retail_value NUMERIC(12,2) NOT NULL CHECK (retail_value > 0),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT item_presets_cost_le_retail CHECK (cost_basis <= retail_value)
      );

      CREATE INDEX IF NOT EXISTS idx_item_presets_store_id ON item_presets (store_id);
    `);
    console.log('item_presets table created successfully.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

migrate();
