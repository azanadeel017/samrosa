'use strict';

/**
 * @module services/teamAlert
 * @description Pilot notification dispatch service.
 *
 * When a new donation is logged, this service fires an alert to the Samrosa
 * operations team so they can manually enter the rescue into Share My Meals.
 *
 * Supports:
 *   - Discord / Slack webhook (TEAM_ALERT_WEBHOOK_URL env var)
 *   - Console fallback when no webhook URL is configured
 *
 * Usage:
 *   const { sendTeamAlert } = require('./services/teamAlert');
 *   await sendTeamAlert({ weight: 15, category: 'BAKERY', deduction: 46.50, transactionId: '...' });
 */

const WEBHOOK_URL = process.env.TEAM_ALERT_WEBHOOK_URL || null;

/**
 * Send a pilot donation alert to the team.
 *
 * @param {object} params
 * @param {number} params.weight       - Total weight in lbs
 * @param {string} params.category     - Classification (BAKERY, PRODUCE, etc.)
 * @param {number} params.deduction    - Enhanced deduction USD
 * @param {string} params.transactionId - Donation UUID
 * @param {string} [params.description] - Item description
 */
async function sendTeamAlert({ weight, category, deduction, transactionId, description }) {
  const timestamp = new Date().toISOString();
  const message = [
    `🚨 NEW PILOT DONATION LOGGED`,
    `Store logged ${weight} lbs of ${category}${description ? ` (${description})` : ''}.`,
    `Enhanced Deduction: $${Number(deduction || 0).toFixed(2)}`,
    `Transaction ID: ${transactionId}`,
    `Timestamp: ${timestamp}`,
    `Ready for Share My Meals manual dispatch.`,
  ].join('\n');

  // Always log to console
  console.log(`\n${'═'.repeat(60)}`);
  console.log(message);
  console.log(`${'═'.repeat(60)}\n`);

  // Fire webhook if configured
  if (WEBHOOK_URL) {
    try {
      // Supports both Discord and Slack webhook formats
      const isDiscord = WEBHOOK_URL.includes('discord.com');
      const body = isDiscord
        ? { content: message }
        : { text: message };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(`[teamAlert] Webhook returned ${res.status}: ${res.statusText}`);
      } else {
        console.log('[teamAlert] Webhook notification sent successfully.');
      }
    } catch (err) {
      // Non-blocking: webhook failure must never block the donation response
      console.error('[teamAlert] Webhook dispatch failed:', err.message);
    }
  } else {
    console.log('[teamAlert] No TEAM_ALERT_WEBHOOK_URL configured — console-only alert.');
  }
}

module.exports = { sendTeamAlert };
