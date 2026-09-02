'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
async function runSchema() {
  const isRemote = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });
  
  try {
    await client.connect();
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
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
