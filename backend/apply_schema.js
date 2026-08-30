'use strict';
require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

async function runSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    const schemaSql = fs.readFileSync('schema.sql', 'utf8');
    
    console.log('Applying schema to database...');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');
    
  } catch (err) {
    console.error('Error applying schema:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runSchema();
