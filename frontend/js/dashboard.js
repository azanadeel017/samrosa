'use strict';

const API_BASE_URL  = '';
const STORAGE_KEY   = 'samrosa_donor_id';

const valWeight  = document.getElementById('val-weight');
const valTax     = document.getElementById('val-tax');
const valCo2     = document.getElementById('val-co2');
const valMethane = document.getElementById('val-methane');
const valMeals   = document.getElementById('val-meals');
const tableBody  = document.getElementById('history-table-body');
const toastContainer = document.getElementById('toast-container');

// ─── Toast System ─────────────────────────────────────────────────────────────

const TOAST_ICONS = { success: '✓', error: '✕', warning: '⚡' };

function showToast(type, title, message, duration = 5000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <div class="toast-body">
      <span class="toast-title">${title}</span>
      <span class="toast-message">${message}</span>
    </div>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('dismissing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchDashboardData() {
  const donorId = localStorage.getItem(STORAGE_KEY);
  if (!donorId) {
    showToast('warning', 'No Store Configured', 'Please configure the cashier terminal first.');
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No store configured. Go to Cashier Terminal to set up.</td></tr>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/metrics/summary/${donorId}`);
    if (!res.ok) throw new Error('Failed to fetch metrics.');
    const json = await res.json();
    
    if (json.success) {
      renderDashboard(json.data);
    } else {
      throw new Error(json.error || 'API error');
    }
  } catch (err) {
    console.error(err);
    showToast('error', 'Error', 'Failed to load dashboard data.');
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--clr-error);">Error loading data.</td></tr>`;
  }
}

let currentDonations = [];

function renderDashboard(data) {
  currentDonations = data.recentDonations || [];
  
  // Update metric cards
  valWeight.textContent  = `${data.totalRescuedWeightLbs.toLocaleString()} lbs`;
  valTax.textContent     = `$${data.totalTaxDeductionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  valCo2.textContent     = `${data.totalAvoidedCO2eKg.toLocaleString()} kg`;
  valMethane.textContent = `${data.totalMethaneAvoidedKg.toLocaleString()} kg`;
  valMeals.textContent   = data.totalMealsEquivalent.toLocaleString();

  // Render table
  if (!data.recentDonations || data.recentDonations.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No recent transactions found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.recentDonations.map(donation => `
    <tr>
      <td>${new Date(donation.date).toLocaleString()}</td>
      <td>${donation.classification.replace('_', ' ')}</td>
      <td>${donation.weight_lbs}</td>
      <td>$${donation.tax_deduction_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');
}

function exportCSV() {
  if (currentDonations.length === 0) {
    showToast('warning', 'No Data', 'No transactions to export.');
    return;
  }

  const headers = [
    'Donation ID', 'Date', 'Category', 'Weight (lbs)', 'Cost Basis ($)',
    'Retail Value ($)', 'Est. §170(e)(3) Deduction ($)', 'CO2e Avoided (kg)',
    'Methane Offset (kg)', 'Meals Equivalent', 'Recipient Organization (501c3)'
  ];

  let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';

  currentDonations.forEach(d => {
    const row = [
      d.id,
      new Date(d.date).toISOString(),
      d.classification,
      d.weight_lbs,
      d.cost_basis,
      d.retail_value,
      d.tax_deduction_usd,
      d.co2e_kg,
      d.methane_kg,
      d.meals_equivalent,
      d.recipient_name
    ];
    csvContent += row.map(val => `"${val}"`).join(',') + '\n';
  });

  csvContent += '\n"Estimates provided for documentation and tax professional review. Final determinations made by the merchant\'s licensed CPA."\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'samrosa_ledger.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();
  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);
});
