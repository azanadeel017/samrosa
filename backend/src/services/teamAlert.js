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
 * @param {string} [params.name]        - Item name/description
 * @param {string} params.category     - Classification (BAKERY, PRODUCE, etc.)
 * @param {number} params.weight       - Total weight in lbs
 * @param {number} [params.cost_basis]   - Cost basis in USD
 * @param {number} [params.retail_value] - Retail value in USD
 * @param {number} [params.calculated_deduction] - Enhanced deduction USD
 * @param {number} [params.deduction]  - Enhanced deduction USD fallback
 * @param {string} params.transactionId - Donation UUID
 * @param {string} [params.description] - Item description
 */
async function sendTeamAlert({
  name,
  category,
  weight,
  cost_basis,
  retail_value,
  calculated_deduction,
  deduction,
  transactionId,
  description,
}) {
  const itemName = name || description || 'Surplus Food';
  const itemCategory = category || 'UNKNOWN';
  const itemWeight = weight !== undefined && weight !== null ? weight : '0';
  const itemCost = cost_basis !== undefined && cost_basis !== null ? Number(cost_basis).toFixed(2) : '0.00';
  const itemRetail = retail_value !== undefined && retail_value !== null ? Number(retail_value).toFixed(2) : '0.00';
  const finalDeduction = Number(calculated_deduction !== undefined ? calculated_deduction : deduction || 0).toFixed(2);
  const timestamp = new Date().toISOString();

  const message = [
    `🚨 NEW PILOT DONATION LOGGED`,
    `Store logged ${itemWeight} lbs of ${itemCategory} (${itemName}).`,
    `Cost Basis: $${itemCost}`,
    `Retail Value: $${itemRetail}`,
    `Enhanced Deduction: $${finalDeduction}`,
    `Transaction ID: ${transactionId || 'N/A'}`,
    `Timestamp: ${timestamp}`,
    `Ready for Share My Meals manual dispatch.`,
  ].join('\n');

  // Always log to console
  console.log(`\n${'═'.repeat(60)}`);
  console.log(message);
  console.log(`${'═'.repeat(60)}\n`);

  const webhookUrl = process.env.TEAM_ALERT_WEBHOOK_URL;

  // Fire webhook if configured
  if (webhookUrl) {
    try {
      const isDiscord = webhookUrl.includes('discord.com');
      const body = isDiscord
        ? {
            content: '🚨 **NEW PILOT DONATION LOGGED**',
            embeds: [
              {
                title: 'Donation Dispatch Details',
                color: 13065010,
                fields: [
                  { name: 'Item / Category', value: `${itemName} (${itemCategory})`, inline: true },
                  { name: 'Weight', value: `${itemWeight} lbs`, inline: true },
                  { name: 'Cost Basis', value: `$${itemCost}`, inline: true },
                  { name: 'Retail Value', value: `$${itemRetail}`, inline: true },
                  { name: 'Calculated Deduction', value: `$${finalDeduction}`, inline: true },
                ],
                timestamp,
              },
            ],
          }
        : { text: message };

      const res = await fetch(webhookUrl, {
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
