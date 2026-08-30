/**
 * samrosa — Cashier PWA Application Logic
 *
 * Responsibilities:
 *   1. Service worker registration and lifecycle management
 *   2. Donor ID setup and localStorage persistence
 *   3. Form state management (weight, category, financials)
 *   4. Real-time IRC § 170(e)(3) enhanced deduction preview
 *   5. Client-side input validation mirroring the backend rules
 *   6. Asynchronous POST to /api/donations/upload
 *   7. Offline detection and user feedback
 *   8. Toast notification system
 */

'use strict';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Base URL for the samrosa backend API.
 * Empty string = same-origin (served from the same host as the frontend).
 * Override with full URL for cross-origin deployments: 'https://api.samrosa.io'
 */
const API_BASE_URL  = '';
const API_ENDPOINT  = `${API_BASE_URL}/api/donations/upload`;
const STORAGE_KEY   = 'samrosa_donor_id';

// ─── DOM References ───────────────────────────────────────────────────────────

const weightSlider      = document.getElementById('weight-slider');
const weightNumber      = document.getElementById('weight-number');
const categoryButtons   = document.querySelectorAll('.category-btn');
const costInput         = document.getElementById('cost-basis');
const retailInput       = document.getElementById('retail-value');
const deductionValue    = document.getElementById('deduction-value');
const deductionPreview  = document.getElementById('deduction-preview');
const validationErrors  = document.getElementById('validation-errors');
const errorList         = document.getElementById('error-list');
const submitButton      = document.getElementById('submit-btn');
const toastContainer    = document.getElementById('toast-container');
const statusDot         = document.getElementById('status-dot');
const statusLabel       = document.getElementById('status-label');
const modalOverlay      = document.getElementById('setup-modal');
const donorIdInput      = document.getElementById('donor-id-input');
const saveSetupBtn      = document.getElementById('save-setup-btn');
const reconfigureLink   = document.getElementById('reconfigure-link');

// ─── Application State ────────────────────────────────────────────────────────

const state = {
  donorId:        null,
  weightLbs:      0,
  classification: 'BAKERY',
  costBasis:      null,
  retailValue:    null,
  isOnline:       navigator.onLine,
  isSubmitting:   false,
};

// ─── Service Worker Registration ──────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[app] Service worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('[app] Service worker registration failed:', err);
      });
  });
}

// ─── Donor Setup ──────────────────────────────────────────────────────────────

function loadDonorId() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidUUID(stored)) {
    state.donorId = stored;
    hideModal();
  } else {
    showModal();
  }
}

function saveSetup() {
  const val = donorIdInput.value.trim();
  if (!isValidUUID(val)) {
    donorIdInput.style.borderColor = 'var(--clr-error)';
    donorIdInput.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.15)';
    showToast('error', 'Invalid Donor ID', 'Please enter the UUID provided by your samrosa administrator.');
    return;
  }
  localStorage.setItem(STORAGE_KEY, val);
  state.donorId = val;
  hideModal();
  showToast('success', 'Terminal Configured', 'Donor profile linked. You can now log donations.');
}

function showModal() { modalOverlay.classList.remove('hidden'); }
function hideModal() { modalOverlay.classList.add('hidden'); }

saveSetupBtn.addEventListener('click', saveSetup);
donorIdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveSetup(); });

// ─── Online / Offline Detection ───────────────────────────────────────────────

function updateNetworkStatus() {
  state.isOnline = navigator.onLine;
  if (navigator.onLine) {
    statusDot.classList.remove('offline');
    statusLabel.textContent = 'Live';
  } else {
    statusDot.classList.add('offline');
    statusLabel.textContent = 'Offline';
    showToast('warning', 'No Connection', 'Working offline — donations will sync when connectivity returns.');
  }
}

window.addEventListener('online',  updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// ─── Weight Controls ──────────────────────────────────────────────────────────

function syncWeightFromSlider() {
  state.weightLbs     = parseFloat(weightSlider.value);
  weightNumber.value  = state.weightLbs;
  updateDeductionPreview();
}

function syncWeightFromNumber() {
  const val = parseFloat(weightNumber.value);
  if (!isNaN(val) && val > 0 && val <= 999) {
    state.weightLbs    = val;
    weightSlider.value = Math.min(val, parseFloat(weightSlider.max));
  }
  updateDeductionPreview();
}

weightSlider.addEventListener('input', syncWeightFromSlider);
weightNumber.addEventListener('input', syncWeightFromNumber);

// ─── Category Selection ───────────────────────────────────────────────────────

categoryButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    categoryButtons.forEach((b) => b.setAttribute('data-active', 'false'));
    btn.setAttribute('data-active', 'true');
    state.classification = btn.dataset.value;
    updateDeductionPreview();
  });
});

// ─── Financial Inputs ─────────────────────────────────────────────────────────

costInput.addEventListener('input',   () => { state.costBasis   = parseFloat(costInput.value)   || null; updateDeductionPreview(); });
retailInput.addEventListener('input', () => { state.retailValue = parseFloat(retailInput.value) || null; updateDeductionPreview(); });

// ─── Live Deduction Preview ───────────────────────────────────────────────────

/**
 * Compute IRC § 170(e)(3) enhanced deduction: min(2C, FMV)
 * Mirrors the GENERATED ALWAYS AS formula in the database schema.
 */
function computeEnhancedDeduction(costBasis, retailValue) {
  if (costBasis < 0 || retailValue <= 0 || costBasis > retailValue) return null;
  return Math.min(2 * costBasis, retailValue);
}

function updateDeductionPreview() {
  const deduction = computeEnhancedDeduction(state.costBasis, state.retailValue);

  if (deduction !== null) {
    deductionPreview.classList.remove('hidden');
    const formatted = deduction.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    if (deductionValue.textContent !== formatted) {
      deductionValue.textContent = formatted;
      deductionValue.classList.add('bump');
      setTimeout(() => deductionValue.classList.remove('bump'), 300);
    }
  } else {
    deductionPreview.classList.add('hidden');
    deductionValue.textContent = '—';
  }
}

// ─── Client-Side Validation ───────────────────────────────────────────────────

function validateForm() {
  const errors = [];

  if (!state.donorId || !isValidUUID(state.donorId)) {
    errors.push('Donor terminal is not configured. Please set your Donor ID.');
  }

  const weight = parseFloat(weightNumber.value);
  if (!weight || weight <= 0) {
    errors.push('Total weight must be greater than 0 lbs.');
  } else if (weight > 999999) {
    errors.push('Total weight exceeds the allowable maximum.');
  }

  if (!state.classification) {
    errors.push('Select a food category.');
  }

  const cost   = parseFloat(costInput.value);
  const retail = parseFloat(retailInput.value);

  if (costInput.value === '' || isNaN(cost)) {
    errors.push('Cost Basis is required.');
  } else if (cost < 0) {
    errors.push('Cost Basis must be 0 or greater.');
  }

  if (retailInput.value === '' || isNaN(retail)) {
    errors.push('Retail Value is required.');
  } else if (retail <= 0) {
    errors.push('Retail Value must be greater than 0.');
  }

  if (!isNaN(cost) && !isNaN(retail) && cost > retail) {
    errors.push('Cost Basis cannot exceed Retail Value.');
    costInput.classList.add('error');
    retailInput.classList.add('error');
  } else {
    costInput.classList.remove('error');
    retailInput.classList.remove('error');
  }

  return errors;
}

function displayErrors(errors) {
  if (errors.length === 0) {
    validationErrors.classList.remove('visible');
    errorList.innerHTML = '';
  } else {
    errorList.innerHTML = errors.map((e) => `<li>${e}</li>`).join('');
    validationErrors.classList.add('visible');
  }
}

// ─── Form Submission ──────────────────────────────────────────────────────────

submitButton.addEventListener('click', handleSubmit);

async function handleSubmit() {
  if (state.isSubmitting) return;

  const errors = validateForm();
  displayErrors(errors);
  if (errors.length > 0) return;

  const payload = {
    donor_id:        state.donorId,
    description:     buildDescription(),
    classification:  state.classification,
    total_weight_lbs: parseFloat(weightNumber.value),
    cost_basis:      parseFloat(costInput.value),
    retail_value:    parseFloat(retailInput.value),
  };

  setSubmitting(true);

  try {
    if (!navigator.onLine) {
      throw new Error('Offline');
    }

    const response = await fetch(API_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const deductionFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD',
      }).format(data.enhanced_deduction);

      showToast(
        'success',
        'Rescue Authorized',
        `Transaction ${data.transaction_id.slice(0, 8).toUpperCase()} logged. ` +
        `Enhanced deduction: ${deductionFormatted}.`
      );
      resetForm();
    } else {
      const detail = data.details?.join(' ') || data.error || 'Please check your inputs and retry.';
      showToast('error', 'Submission Failed', detail);
      if (data.details) displayErrors(data.details);
    }

  } catch (err) {
    console.error('[app] Submission error or offline:', err);
    saveToOfflineQueue(payload);
    showToast('warning', 'Saved Offline', 'Offline - Saved to local queue. Will sync when reconnected.');
    resetForm();
  } finally {
    setSubmitting(false);
  }
}

// ─── Offline Queue Logic ──────────────────────────────────────────────────────

const OFFLINE_QUEUE_KEY = 'samrosa_offline_queue';

function saveToOfflineQueue(payload) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  queue.push(payload);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  if (queue.length === 0) return;

  showToast('success', 'Syncing', `Syncing ${queue.length} offline donations...`);
  const remainingQueue = [];

  for (const payload of queue) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!response.ok) {
        remainingQueue.push(payload);
      }
    } catch (err) {
      remainingQueue.push(payload);
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  
  if (remainingQueue.length === 0) {
    showToast('success', 'Sync Complete', 'All offline donations have been synced.');
  } else {
    showToast('warning', 'Sync Partial', `${remainingQueue.length} donations could not be synced and remain in queue.`);
  }
}

window.addEventListener('online', () => {
  updateNetworkStatus();
  syncOfflineQueue();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDescription() {
  const cat = state.classification.replace('_', ' ');
  const weight = parseFloat(weightNumber.value);
  return `${cat} food surplus — ${weight} lbs. Logged via samrosa cashier terminal.`;
}

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function setSubmitting(flag) {
  state.isSubmitting = flag;
  submitButton.disabled = flag;
  submitButton.classList.toggle('loading', flag);
}

function resetForm() {
  weightSlider.value    = 0;
  weightNumber.value    = '';
  state.weightLbs       = 0;
  state.costBasis       = null;
  state.retailValue     = null;
  costInput.value       = '';
  retailInput.value     = '';
  costInput.classList.remove('error');
  retailInput.classList.remove('error');
  categoryButtons.forEach((b) => b.setAttribute('data-active', b.dataset.value === 'BAKERY' ? 'true' : 'false'));
  state.classification  = 'BAKERY';
  displayErrors([]);
  updateDeductionPreview();
  weightNumber.focus();
}

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

// ─── Initialization ───────────────────────────────────────────────────────────

if (reconfigureLink) {
  reconfigureLink.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

loadDonorId();
updateNetworkStatus();
syncWeightFromSlider();
