'use strict';

/**
 * @file server.js
 * @description samrosa — Express application entry point.
 *
 * Startup sequence:
 *   1. Load environment variables from .env (dotenv)
 *   2. Instantiate Express app and register global middleware
 *   3. Mount feature routers
 *   4. Register 404 and global error handlers
 *   5. Verify database connectivity (fail-fast)
 *   6. Start HTTP listener
 *
 * Graceful shutdown:
 *   SIGTERM and SIGINT signals are trapped to drain in-flight requests before
 *   closing the database pool and process. This prevents connection leaks on
 *   container restarts (Kubernetes, Cloud Run, Fly.io, etc.).
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const { healthCheck, pool } = require('./db');

// ─── Feature Routers ──────────────────────────────────────────────────────────
const donationsRouter = require('./routes/donations');
const metricsRouter = require('./routes/metrics');

// ─── App Instantiation ────────────────────────────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── Global Middleware ────────────────────────────────────────────────────────

const cors = require('cors');
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5000'] }));

// Parse incoming JSON payloads (max 1 MB to prevent body-bomb DoS)
app.use(express.json({ limit: '1mb' }));

// Parse URL-encoded form bodies (extended: false = querystring module, no prototype pollution)
app.use(express.urlencoded({ extended: false }));

// Remove fingerprinting header
app.disable('x-powered-by');

// Request logging — minimal structured format, swap for Morgan/Pino in production
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// ─── Health / Liveness Probe ─────────────────────────────────────────────────

/**
 * GET /health
 * Lightweight liveness endpoint for load balancers and container orchestrators.
 * Returns 200 when the process is reachable; does NOT probe the database.
 * For a readiness probe that verifies DB connectivity, use /ready.
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status:  'ok',
    service: 'samrosa-api',
    version: process.env.npm_package_version || '0.1.0',
    uptime:  process.uptime(),
  });
});

/**
 * GET /ready
 * Readiness probe. Executes a lightweight database ping before returning 200.
 * Use this as a Kubernetes readinessProbe or ECS health check.
 */
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'unreachable' });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/donations', donationsRouter);
app.use('/api/v1/metrics', metricsRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must have all four parameters for Express to recognize it as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Malformed JSON bodies
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error:   'Invalid JSON in request body.',
    });
  }

  // Payload too large
  if (err.status === 413) {
    return res.status(413).json({
      success: false,
      error:   'Request body exceeds the 1 MB limit.',
    });
  }

  console.error('[server] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error:   'An unexpected error occurred.',
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
let server;

const start = async () => {
  try {
    await healthCheck();
  } catch (err) {
    console.error('[server] Database health check failed — aborting startup:', err.message);
    process.exit(1);
  }

  server = app.listen(PORT, () => {
    console.log(`[server] samrosa API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`[server] ${signal} received — initiating graceful shutdown…`);

  if (server) {
    server.close(async () => {
      console.log('[server] HTTP server closed.');
      try {
        await pool.end();
        console.log('[server] Database pool drained.');
      } catch (err) {
        console.error('[server] Error draining pool:', err.message);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start();

module.exports = app; // Export for testing frameworks (Supertest, Jest, etc.)
