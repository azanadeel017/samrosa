'use strict';

/**
 * @module db
 * @description PostgreSQL connection pool singleton.
 *
 * Design rationale:
 *  - A single Pool instance is created at module load time and reused across
 *    all request handlers. This avoids the overhead of establishing a new
 *    TCP connection per query and makes connection accounting deterministic.
 *  - Configuration is resolved in priority order:
 *      1. DATABASE_URL (connection string — preferred for Heroku / Railway / Fly.io)
 *      2. Individual PG* environment variables (explicit params)
 *  - Pool tuning values are surfaced as environment variables so they can be
 *    adjusted per deployment environment without code changes.
 *  - A startup health-check query is executed once to surface misconfiguration
 *    early (fail-fast principle) rather than at first request time.
 */

const { Pool } = require('pg');

// ─── Pool Configuration ───────────────────────────────────────────────────────

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // Required when connecting to Heroku Postgres or any TLS-enforcing provider
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host:     process.env.PGHOST     || 'localhost',
      port:     parseInt(process.env.PGPORT || '5432', 10),
      user:     process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    };

const pool = new Pool({
  ...poolConfig,
  max:              parseInt(process.env.DB_POOL_MAX              || '10',   10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '2000', 10),
});

// ─── Pool Event Listeners ─────────────────────────────────────────────────────

pool.on('connect', (client) => {
  // Log which database the pool connected to — useful during multi-env debugging
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[db] New client connected — pool size: ${pool.totalCount}`);
  }
});

pool.on('error', (err, client) => {
  // An idle client has emitted an error — log and let the pool handle recovery
  console.error('[db] Unexpected error on idle client:', err.message);
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute a parameterized query against the pool.
 *
 * @param {string}  text   - SQL query string with $1, $2 … placeholders
 * @param {Array}   params - Positional parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a dedicated client from the pool for multi-statement transactions.
 * Callers are responsible for calling client.release() in a finally block.
 *
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

/**
 * Perform a lightweight connectivity check.
 * Called once at server startup to surface misconfiguration early.
 *
 * @returns {Promise<void>}
 */
const healthCheck = async () => {
  const result = await pool.query('SELECT NOW() AS db_time');
  console.log(`[db] Health check passed — db time: ${result.rows[0].db_time}`);
};

module.exports = { query, getClient, healthCheck, pool };
